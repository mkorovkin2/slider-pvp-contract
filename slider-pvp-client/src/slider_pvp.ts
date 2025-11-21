/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/slider_pvp.json`.
 */
export type SliderPvp = {
  "address": "9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT",
  "metadata": {
    "name": "sliderPvp",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Trustless wager/escrow smart contract for Solana"
  },
  "instructions": [
    {
      "name": "cancelWager",
      "docs": [
        "Cancel wager and refund deposited player if other player hasn't deposited within timeout"
      ],
      "discriminator": [
        57,
        92,
        124,
        123,
        216,
        16,
        37,
        148
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true
        },
        {
          "name": "player2",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "declareWinner",
      "docs": [
        "Arbiter declares a winner (must be within timeout period)"
      ],
      "discriminator": [
        140,
        135,
        197,
        50,
        9,
        23,
        4,
        80
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "arbiter",
          "signer": true
        },
        {
          "name": "winnerAccount",
          "writable": true
        },
        {
          "name": "feeRecipient",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "winner",
          "type": "u8"
        }
      ]
    },
    {
      "name": "depositPlayer1",
      "docs": [
        "Player 1 deposits their wager amount"
      ],
      "discriminator": [
        149,
        29,
        47,
        69,
        190,
        122,
        117,
        208
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "depositPlayer2",
      "docs": [
        "Player 2 deposits their wager amount"
      ],
      "discriminator": [
        245,
        217,
        128,
        54,
        38,
        173,
        185,
        241
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "player2",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeWager",
      "docs": [
        "Initialize a new wager between two players"
      ],
      "discriminator": [
        107,
        74,
        43,
        36,
        7,
        67,
        110,
        204
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "player1"
              },
              {
                "kind": "arg",
                "path": "player2"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "player1"
              },
              {
                "kind": "arg",
                "path": "player2"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "player1",
          "type": "pubkey"
        },
        {
          "name": "player2",
          "type": "pubkey"
        },
        {
          "name": "arbiter",
          "type": "pubkey"
        },
        {
          "name": "feeRecipient",
          "type": "pubkey"
        },
        {
          "name": "wagerAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refund",
      "docs": [
        "Refund both players if timeout has expired"
      ],
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "wager",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  103,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wager.player1",
                "account": "wager"
              },
              {
                "kind": "account",
                "path": "wager.player2",
                "account": "wager"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true
        },
        {
          "name": "player2",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "wager",
      "discriminator": [
        3,
        110,
        53,
        190,
        113,
        31,
        230,
        40
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "samePlayer",
      "msg": "Player 1 and Player 2 cannot be the same"
    },
    {
      "code": 6001,
      "name": "invalidWagerAmount",
      "msg": "Wager amount must be greater than 0"
    },
    {
      "code": 6002,
      "name": "alreadyDeposited",
      "msg": "Player has already deposited"
    },
    {
      "code": 6003,
      "name": "unauthorizedPlayer",
      "msg": "Unauthorized player"
    },
    {
      "code": 6004,
      "name": "wagerAlreadySettled",
      "msg": "Wager has already been settled"
    },
    {
      "code": 6005,
      "name": "bothPlayersNotDeposited",
      "msg": "Both players must deposit before declaring winner or refunding"
    },
    {
      "code": 6006,
      "name": "unauthorizedArbiter",
      "msg": "Unauthorized arbiter"
    },
    {
      "code": 6007,
      "name": "invalidWinner",
      "msg": "Invalid winner (must be 1 or 2)"
    },
    {
      "code": 6008,
      "name": "timeoutExpired",
      "msg": "Timeout period has expired, cannot declare winner"
    },
    {
      "code": 6009,
      "name": "timeoutNotExpired",
      "msg": "Timeout period has not expired yet, cannot refund"
    },
    {
      "code": 6010,
      "name": "bothPlayersAlreadyDeposited",
      "msg": "Both players have already deposited, cannot cancel"
    },
    {
      "code": 6011,
      "name": "depositTimeoutNotExpired",
      "msg": "Deposit timeout has not expired yet, cannot cancel"
    }
  ],
  "types": [
    {
      "name": "wager",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player1",
            "type": "pubkey"
          },
          {
            "name": "player2",
            "type": "pubkey"
          },
          {
            "name": "arbiter",
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "wagerAmount",
            "type": "u64"
          },
          {
            "name": "player1Deposited",
            "type": "bool"
          },
          {
            "name": "player2Deposited",
            "type": "bool"
          },
          {
            "name": "creationTime",
            "type": "i64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "winner",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "isSettled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "initializationCost",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
