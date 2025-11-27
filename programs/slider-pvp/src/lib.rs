use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_lang::solana_program::sysvar::rent::Rent;

declare_id!("HbatSgiDtdwtnEix8oJzCQMF3WXx4aj2uF7qRg89Brp5");

const TIMEOUT_SECONDS: i64 = 120;
const DEPOSIT_TIMEOUT_SECONDS: i64 = 30;
const WINNER_PERCENTAGE: u64 = 95;
const FEE_PERCENTAGE: u64 = 5;
const MAX_WAGER_AMOUNT: u64 = 1_000_000_000_000; // 1000 SOL

#[program]
pub mod slider_pvp {
    use super::*;

    /// Initialize a new wager between two players
    pub fn initialize_wager(
        ctx: Context<InitializeWager>,
        player1: Pubkey,
        player2: Pubkey,
        arbiter: Pubkey,
        fee_recipient: Pubkey,
        wager_amount: u64,
        game_id: u64,
    ) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(player1 != player2, ErrorCode::SamePlayer);
        require!(wager_amount > 0, ErrorCode::InvalidWagerAmount);
        require!(wager_amount <= MAX_WAGER_AMOUNT, ErrorCode::WagerAmountTooLarge);
        
        // Prevent conflicts of interest
        require!(arbiter != player1, ErrorCode::ArbiterCannotBePlayer);
        require!(arbiter != player2, ErrorCode::ArbiterCannotBePlayer);
        require!(fee_recipient != player1, ErrorCode::FeeRecipientConflict);
        require!(fee_recipient != player2, ErrorCode::FeeRecipientConflict);
        require!(arbiter != fee_recipient, ErrorCode::ArbiterFeeRecipientConflict);
        
        // Calculate initialization cost (rent for wager PDA only)
        let rent = Rent::get()?;
        let wager_rent = rent.minimum_balance(8 + std::mem::size_of::<Wager>());
        let total_initialization_cost = wager_rent;
        
        wager.player1 = player1;
        wager.player2 = player2;
        wager.arbiter = arbiter;
        wager.fee_recipient = fee_recipient;
        wager.payer = ctx.accounts.payer.key();
        wager.wager_amount = wager_amount;
        wager.game_id = game_id;
        wager.player1_deposited = false;
        wager.player2_deposited = false;
        wager.creation_time = Clock::get()?.unix_timestamp;
        wager.start_time = 0;
        wager.winner = None;
        wager.is_settled = false;
        wager.bump = ctx.bumps.wager;
        wager.initialization_cost = total_initialization_cost;
        
        msg!("Wager initialized: {} SOL per player", wager_amount as f64 / 1_000_000_000.0);
        msg!("Game ID: {}", game_id);
        msg!("Initialization cost: {} SOL (will be deducted from final payout)", total_initialization_cost as f64 / 1_000_000_000.0);
        msg!("Player 1: {}", player1);
        msg!("Player 2: {}", player2);
        msg!("Arbiter: {}", arbiter);
        msg!("Fee Recipient: {}", fee_recipient);
        
        Ok(())
    }

    /// Player 1 deposits their wager amount
    pub fn deposit_player1(ctx: Context<DepositPlayer1>) -> Result<()> {
        let wager = &ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(!wager.player1_deposited, ErrorCode::AlreadyDeposited);
        require!(
            ctx.accounts.player1.key() == wager.player1,
            ErrorCode::UnauthorizedPlayer
        );
        
        // Transfer SOL from player1 to wager PDA
        let wager_amount = wager.wager_amount;
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player1.to_account_info(),
                to: ctx.accounts.wager.to_account_info(),
            },
        );
        transfer(cpi_context, wager_amount)?;
        
        let wager = &mut ctx.accounts.wager;
        
    wager.player1_deposited = true;
    
    // If both players have deposited, start the timer (only set once)
    if wager.player2_deposited && wager.start_time == 0 {
        wager.start_time = Clock::get()?.unix_timestamp;
        msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
    } else if !wager.player2_deposited {
        msg!("Player 1 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
    }
        
        Ok(())
    }

    /// Player 2 deposits their wager amount
    pub fn deposit_player2(ctx: Context<DepositPlayer2>) -> Result<()> {
        let wager = &ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(!wager.player2_deposited, ErrorCode::AlreadyDeposited);
        require!(
            ctx.accounts.player2.key() == wager.player2,
            ErrorCode::UnauthorizedPlayer
        );
        
        // Transfer SOL from player2 to wager PDA
        let wager_amount = wager.wager_amount;
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player2.to_account_info(),
                to: ctx.accounts.wager.to_account_info(),
            },
        );
        transfer(cpi_context, wager_amount)?;
        
        let wager = &mut ctx.accounts.wager;
        
    wager.player2_deposited = true;
    
    // If both players have deposited, start the timer (only set once)
    if wager.player1_deposited && wager.start_time == 0 {
        wager.start_time = Clock::get()?.unix_timestamp;
        msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
    } else if !wager.player1_deposited {
        msg!("Player 2 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
    }
        
        Ok(())
    }

    /// Arbiter declares a winner (must be within timeout period)
    pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
        let wager = &ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(
            ctx.accounts.arbiter.key() == wager.arbiter,
            ErrorCode::UnauthorizedArbiter
        );
        require!(
            wager.player1_deposited && wager.player2_deposited,
            ErrorCode::BothPlayersNotDeposited
        );
        require!(winner == 1 || winner == 2, ErrorCode::InvalidWinner);
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - wager.start_time <= TIMEOUT_SECONDS,
            ErrorCode::TimeoutExpired
        );
        
        let total_pool = wager.wager_amount
            .checked_mul(2)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        let winner_amount = total_pool
            .checked_mul(WINNER_PERCENTAGE)
            .ok_or(ErrorCode::ArithmeticOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let fee_amount = total_pool
            .checked_sub(winner_amount)
            .ok_or(ErrorCode::ArithmeticUnderflow)?;
        
        // Validate that the provided winner_account matches the declared winner
        let winner_pubkey = if winner == 1 {
            wager.player1
        } else {
            wager.player2
        };
        
        require!(
            ctx.accounts.winner_account.key() == winner_pubkey,
            ErrorCode::WinnerAccountMismatch
        );
        
        // Validate sufficient balance for transfers
        let wager_balance = ctx.accounts.wager.to_account_info().lamports();
        let total_transfer = winner_amount
            .checked_add(fee_amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        require!(
            wager_balance >= total_transfer,
            ErrorCode::InsufficientBalance
        );
        
        // Transfer from wager PDA using manual lamport manipulation
        // Transfer winner amount
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= winner_amount;
        **ctx.accounts.winner_account.try_borrow_mut_lamports()? += winner_amount;
        
        // Transfer fee amount
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
        **ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += fee_amount;
        
        let wager = &mut ctx.accounts.wager;
        
        wager.winner = Some(winner);
        wager.is_settled = true;
        
        msg!("Winner declared: Player {}", winner);
        msg!("Winner receives: {} SOL", winner_amount as f64 / 1_000_000_000.0);
        msg!("Fee: {} SOL", fee_amount as f64 / 1_000_000_000.0);
        
        // Close wager PDA and send remaining rent to payer
        let remaining_lamports = ctx.accounts.wager.to_account_info().lamports();
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.payer_account.try_borrow_mut_lamports()? += remaining_lamports;
        
        msg!("Rent refunded to initializer: {} SOL", remaining_lamports as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    /// Refund both players if timeout has expired (arbiter only)
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let wager = &ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(
            ctx.accounts.arbiter.key() == wager.arbiter,
            ErrorCode::UnauthorizedArbiter
        );
        require!(
            wager.player1_deposited && wager.player2_deposited,
            ErrorCode::BothPlayersNotDeposited
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - wager.start_time > TIMEOUT_SECONDS,
            ErrorCode::TimeoutNotExpired
        );
        
        // Transfer from wager PDA using manual lamport manipulation
        let total_pool = wager.wager_amount
            .checked_mul(2)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let refund_amount = total_pool
            .checked_div(2)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        // Validate sufficient balance for refunds
        let wager_balance = ctx.accounts.wager.to_account_info().lamports();
        let total_refund = refund_amount
            .checked_mul(2)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        require!(
            wager_balance >= total_refund,
            ErrorCode::InsufficientBalance
        );
        
        // Refund player 1 from wager
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.player1.try_borrow_mut_lamports()? += refund_amount;
        
        // Refund player 2 from wager
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
        **ctx.accounts.player2.try_borrow_mut_lamports()? += refund_amount;
        
        let wager = &mut ctx.accounts.wager;
        
        wager.is_settled = true;
        
        msg!("Refund issued to both players: {} SOL each", refund_amount as f64 / 1_000_000_000.0);
        
        // Close wager PDA and send remaining rent to payer
        let remaining_lamports = ctx.accounts.wager.to_account_info().lamports();
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.payer_account.try_borrow_mut_lamports()? += remaining_lamports;
        
        msg!("Rent refunded to initializer: {} SOL", remaining_lamports as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    /// Cancel wager and refund deposited player if other player hasn't deposited within timeout (arbiter only)
    pub fn cancel_wager(ctx: Context<CancelWager>) -> Result<()> {
        let wager = &ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(
            ctx.accounts.arbiter.key() == wager.arbiter,
            ErrorCode::UnauthorizedArbiter
        );
        require!(
            !(wager.player1_deposited && wager.player2_deposited),
            ErrorCode::BothPlayersAlreadyDeposited
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - wager.creation_time > DEPOSIT_TIMEOUT_SECONDS,
            ErrorCode::DepositTimeoutNotExpired
        );
        
        let player1_deposited = wager.player1_deposited;
        let player2_deposited = wager.player2_deposited;
        let refund_amount = wager.wager_amount;
        
        // Validate sufficient balance for refunds
        let wager_balance = ctx.accounts.wager.to_account_info().lamports();
        if player1_deposited && player2_deposited {
            let total_refund = refund_amount
                .checked_mul(2)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            require!(
                wager_balance >= total_refund,
                ErrorCode::InsufficientBalance
            );
        } else if player1_deposited || player2_deposited {
            require!(
                wager_balance >= refund_amount,
                ErrorCode::InsufficientBalance
            );
        }
        
        // Refund using manual lamport manipulation from wager PDA
        if player1_deposited {
            **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.player1.try_borrow_mut_lamports()? += refund_amount;
            msg!("Player 1 refunded: {} SOL", refund_amount as f64 / 1_000_000_000.0);
        }
        
        if player2_deposited {
            **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.player2.try_borrow_mut_lamports()? += refund_amount;
            msg!("Player 2 refunded: {} SOL", refund_amount as f64 / 1_000_000_000.0);
        }
        
        let wager = &mut ctx.accounts.wager;
        
        wager.is_settled = true;
        
        msg!("Wager cancelled due to incomplete deposits after {} seconds", DEPOSIT_TIMEOUT_SECONDS);
        
        // Close wager PDA and send remaining rent to payer
        let remaining_lamports = ctx.accounts.wager.to_account_info().lamports();
        **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.payer_account.try_borrow_mut_lamports()? += remaining_lamports;
        
        msg!("Rent refunded to initializer: {} SOL", remaining_lamports as f64 / 1_000_000_000.0);
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(player1: Pubkey, player2: Pubkey, arbiter: Pubkey, fee_recipient: Pubkey, wager_amount: u64, game_id: u64)]
pub struct InitializeWager<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Wager::INIT_SPACE,
        seeds = [b"wager", player1.as_ref(), player2.as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub wager: Account<'info, Wager>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPlayer1<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref(), wager.game_id.to_le_bytes().as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    #[account(mut)]
    pub player1: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPlayer2<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref(), wager.game_id.to_le_bytes().as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    #[account(mut)]
    pub player2: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref(), wager.game_id.to_le_bytes().as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: Validated in instruction logic to match winner parameter (player1 or player2)
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,
    /// CHECK: Must match the stored fee_recipient in wager state
    #[account(
        mut,
        constraint = fee_recipient.key() == wager.fee_recipient @ ErrorCode::InvalidFeeRecipient
    )]
    pub fee_recipient: AccountInfo<'info>,
    /// CHECK: Must match the stored payer in wager state
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref(), wager.game_id.to_le_bytes().as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: Must match the stored player1 in wager state
    #[account(
        mut,
        constraint = player1.key() == wager.player1 @ ErrorCode::InvalidPlayer1Account
    )]
    pub player1: AccountInfo<'info>,
    /// CHECK: Must match the stored player2 in wager state
    #[account(
        mut,
        constraint = player2.key() == wager.player2 @ ErrorCode::InvalidPlayer2Account
    )]
    pub player2: AccountInfo<'info>,
    /// CHECK: Must match the stored payer in wager state
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelWager<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref(), wager.game_id.to_le_bytes().as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: Must match the stored player1 in wager state
    #[account(
        mut,
        constraint = player1.key() == wager.player1 @ ErrorCode::InvalidPlayer1Account
    )]
    pub player1: AccountInfo<'info>,
    /// CHECK: Must match the stored player2 in wager state
    #[account(
        mut,
        constraint = player2.key() == wager.player2 @ ErrorCode::InvalidPlayer2Account
    )]
    pub player2: AccountInfo<'info>,
    /// CHECK: Must match the stored payer in wager state
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Wager {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub arbiter: Pubkey,
    pub fee_recipient: Pubkey,
    pub payer: Pubkey,
    pub wager_amount: u64,
    pub game_id: u64,
    pub player1_deposited: bool,
    pub player2_deposited: bool,
    pub creation_time: i64,
    pub start_time: i64,
    pub winner: Option<u8>,
    pub is_settled: bool,
    pub bump: u8,
    pub initialization_cost: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Player 1 and Player 2 cannot be the same")]
    SamePlayer,
    #[msg("Wager amount must be greater than 0")]
    InvalidWagerAmount,
    #[msg("Player has already deposited")]
    AlreadyDeposited,
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    #[msg("Wager has already been settled")]
    WagerAlreadySettled,
    #[msg("Both players must deposit before declaring winner or refunding")]
    BothPlayersNotDeposited,
    #[msg("Unauthorized arbiter")]
    UnauthorizedArbiter,
    #[msg("Invalid winner (must be 1 or 2)")]
    InvalidWinner,
    #[msg("Timeout period has expired, cannot declare winner")]
    TimeoutExpired,
    #[msg("Timeout period has not expired yet, cannot refund")]
    TimeoutNotExpired,
    #[msg("Both players have already deposited, cannot cancel")]
    BothPlayersAlreadyDeposited,
    #[msg("Deposit timeout has not expired yet, cannot cancel")]
    DepositTimeoutNotExpired,
    #[msg("Winner account does not match declared winner")]
    WinnerAccountMismatch,
    #[msg("Invalid fee recipient account")]
    InvalidFeeRecipient,
    #[msg("Invalid payer account")]
    InvalidPayerAccount,
    #[msg("Invalid player1 account")]
    InvalidPlayer1Account,
    #[msg("Invalid player2 account")]
    InvalidPlayer2Account,
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    #[msg("Insufficient balance in wager account")]
    InsufficientBalance,
    #[msg("Wager amount exceeds maximum allowed")]
    WagerAmountTooLarge,
    #[msg("Arbiter cannot be a player")]
    ArbiterCannotBePlayer,
    #[msg("Fee recipient cannot be a player")]
    FeeRecipientConflict,
    #[msg("Arbiter cannot be the fee recipient")]
    ArbiterFeeRecipientConflict,
}

