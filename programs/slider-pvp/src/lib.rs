use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const TIMEOUT_SECONDS: i64 = 120;
const DEPOSIT_TIMEOUT_SECONDS: i64 = 30;
const WINNER_PERCENTAGE: u64 = 95;
const FEE_PERCENTAGE: u64 = 5;

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
    ) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(player1 != player2, ErrorCode::SamePlayer);
        require!(wager_amount > 0, ErrorCode::InvalidWagerAmount);
        
        wager.player1 = player1;
        wager.player2 = player2;
        wager.arbiter = arbiter;
        wager.fee_recipient = fee_recipient;
        wager.wager_amount = wager_amount;
        wager.player1_deposited = false;
        wager.player2_deposited = false;
        wager.creation_time = Clock::get()?.unix_timestamp;
        wager.start_time = 0;
        wager.winner = None;
        wager.is_settled = false;
        wager.bump = ctx.bumps.wager;
        
        msg!("Wager initialized: {} SOL per player", wager_amount as f64 / 1_000_000_000.0);
        msg!("Player 1: {}", player1);
        msg!("Player 2: {}", player2);
        msg!("Arbiter: {}", arbiter);
        msg!("Fee Recipient: {}", fee_recipient);
        
        Ok(())
    }

    /// Player 1 deposits their wager amount
    pub fn deposit_player1(ctx: Context<DepositPlayer1>) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(!wager.player1_deposited, ErrorCode::AlreadyDeposited);
        require!(
            ctx.accounts.player1.key() == wager.player1,
            ErrorCode::UnauthorizedPlayer
        );
        
        // Transfer SOL from player1 to wager PDA
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player1.to_account_info(),
                to: ctx.accounts.wager.to_account_info(),
            },
        );
        transfer(cpi_context, wager.wager_amount)?;
        
        wager.player1_deposited = true;
        
        // If both players have deposited, start the timer
        if wager.player2_deposited {
            wager.start_time = Clock::get()?.unix_timestamp;
            msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
        } else {
            msg!("Player 1 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
        }
        
        Ok(())
    }

    /// Player 2 deposits their wager amount
    pub fn deposit_player2(ctx: Context<DepositPlayer2>) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(!wager.player2_deposited, ErrorCode::AlreadyDeposited);
        require!(
            ctx.accounts.player2.key() == wager.player2,
            ErrorCode::UnauthorizedPlayer
        );
        
        // Transfer SOL from player2 to wager PDA
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player2.to_account_info(),
                to: ctx.accounts.wager.to_account_info(),
            },
        );
        transfer(cpi_context, wager.wager_amount)?;
        
        wager.player2_deposited = true;
        
        // If both players have deposited, start the timer
        if wager.player1_deposited {
            wager.start_time = Clock::get()?.unix_timestamp;
            msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
        } else {
            msg!("Player 2 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
        }
        
        Ok(())
    }

    /// Arbiter declares a winner (must be within timeout period)
    pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
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
        
        let total_pool = wager.wager_amount.checked_mul(2).unwrap();
        let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
        let fee_amount = total_pool.checked_sub(winner_amount).unwrap();
        
        let winner_pubkey = if winner == 1 {
            wager.player1
        } else {
            wager.player2
        };
        
        // Transfer winner amount
        let seeds = &[
            b"wager".as_ref(),
            wager.player1.as_ref(),
            wager.player2.as_ref(),
            &[wager.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.wager.to_account_info(),
                to: ctx.accounts.winner_account.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, winner_amount)?;
        
        // Transfer fee amount
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.wager.to_account_info(),
                to: ctx.accounts.fee_recipient.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, fee_amount)?;
        
        wager.winner = Some(winner);
        wager.is_settled = true;
        
        msg!("Winner declared: Player {}", winner);
        msg!("Winner receives: {} SOL", winner_amount as f64 / 1_000_000_000.0);
        msg!("Fee: {} SOL", fee_amount as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    /// Refund both players if timeout has expired
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(
            wager.player1_deposited && wager.player2_deposited,
            ErrorCode::BothPlayersNotDeposited
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - wager.start_time > TIMEOUT_SECONDS,
            ErrorCode::TimeoutNotExpired
        );
        
        let seeds = &[
            b"wager".as_ref(),
            wager.player1.as_ref(),
            wager.player2.as_ref(),
            &[wager.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Refund player 1
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.wager.to_account_info(),
                to: ctx.accounts.player1.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, wager.wager_amount)?;
        
        // Refund player 2
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.wager.to_account_info(),
                to: ctx.accounts.player2.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, wager.wager_amount)?;
        
        wager.is_settled = true;
        
        msg!("Refund issued to both players: {} SOL each", wager.wager_amount as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    /// Cancel wager and refund deposited player if other player hasn't deposited within timeout
    pub fn cancel_wager(ctx: Context<CancelWager>) -> Result<()> {
        let wager = &mut ctx.accounts.wager;
        
        require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
        require!(
            !(wager.player1_deposited && wager.player2_deposited),
            ErrorCode::BothPlayersAlreadyDeposited
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - wager.creation_time > DEPOSIT_TIMEOUT_SECONDS,
            ErrorCode::DepositTimeoutNotExpired
        );
        
        let seeds = &[
            b"wager".as_ref(),
            wager.player1.as_ref(),
            wager.player2.as_ref(),
            &[wager.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Refund player 1 if they deposited
        if wager.player1_deposited {
            let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.wager.to_account_info(),
                    to: ctx.accounts.player1.to_account_info(),
                },
                signer_seeds,
            );
            transfer(cpi_context, wager.wager_amount)?;
            msg!("Player 1 refunded: {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
        }
        
        // Refund player 2 if they deposited
        if wager.player2_deposited {
            let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.wager.to_account_info(),
                    to: ctx.accounts.player2.to_account_info(),
                },
                signer_seeds,
            );
            transfer(cpi_context, wager.wager_amount)?;
            msg!("Player 2 refunded: {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
        }
        
        wager.is_settled = true;
        
        msg!("Wager cancelled due to incomplete deposits after {} seconds", DEPOSIT_TIMEOUT_SECONDS);
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(player1: Pubkey, player2: Pubkey)]
pub struct InitializeWager<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Wager::INIT_SPACE,
        seeds = [b"wager", player1.as_ref(), player2.as_ref()],
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
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref()],
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
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref()],
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
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: This is the winner account (either player1 or player2)
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,
    /// CHECK: This is the fee recipient account
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    /// CHECK: Player 1 account for refund
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player 2 account for refund
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelWager<'info> {
    #[account(
        mut,
        seeds = [b"wager", wager.player1.as_ref(), wager.player2.as_ref()],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    /// CHECK: Player 1 account for refund
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player 2 account for refund
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Wager {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub arbiter: Pubkey,
    pub fee_recipient: Pubkey,
    pub wager_amount: u64,
    pub player1_deposited: bool,
    pub player2_deposited: bool,
    pub creation_time: i64,
    pub start_time: i64,
    pub winner: Option<u8>,
    pub is_settled: bool,
    pub bump: u8,
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
}

