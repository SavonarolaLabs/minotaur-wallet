// src/action/tx.test.ts

import { describe, it, expect, vi } from 'vitest';

// Mock `ergo-lib-wasm-browser`
vi.mock('ergo-lib-wasm-browser', () => {
  const mockI64 = {
    to_str: vi.fn().mockReturnValue('100000000'),
    as_num: vi.fn(() => 100000000),
  };

  return {
    I64: {
      from_str: vi.fn(() => mockI64),
    },
    BoxValue: {
      SAFE_USER_MIN: vi.fn(() => ({
        as_i64: vi.fn(() => ({
          to_str: vi.fn(() => '1000000'),
        })),
      })),
      from_i64: vi.fn(),
    },
    NetworkPrefix: {
      Mainnet: 0,
      Testnet: 16,
    },
    Address: {
      from_base58: vi.fn(() => ({})),
      recreate_from_ergo_tree: vi.fn(() => ({
        to_base58: vi.fn().mockReturnValue('dummy_address'),
      })),
    },
    Contract: {
      pay_to_address: vi.fn(),
    },
    ErgoBox: vi.fn(() => ({
      value: vi.fn(() => ({
        as_i64: vi.fn(() => ({ to_str: vi.fn(() => '1000000000') })),
      })),
      tokens: vi.fn(() => ({
        len: vi.fn(() => 0),
        get: vi.fn(),
      })),
      box_id: vi.fn().mockReturnValue('dummy_box_id'),
      ergo_tree: vi.fn(),
      to_json: vi.fn(() => ({})),
    })),
    ErgoBoxCandidateBuilder: vi.fn(() => ({
      add_token: vi.fn(),
      set_register_value: vi.fn(),
      build: vi.fn(() => ({
        value: vi.fn(() => ({
          as_i64: vi.fn(() => ({ to_str: vi.fn(() => '1000000000') })),
        })),
        tokens: vi.fn(() => ({
          len: vi.fn(() => 0),
          get: vi.fn(),
        })),
        ergo_tree: vi.fn(),
        to_json: vi.fn(),
      })),
    })),
    ErgoBoxes: {
      empty: vi.fn(() => ({
        add: vi.fn(),
        len: vi.fn().mockReturnValue(0),
        get: vi.fn(),
      })),
    },
    ErgoBoxCandidates: {
      empty: vi.fn(() => ({
        add: vi.fn(),
        len: vi.fn().mockReturnValue(0),
        get: vi.fn(),
      })),
    },
    ErgoBoxAssetsDataList: vi.fn(() => ({})),
    BoxSelection: vi.fn(() => ({
      boxes: vi.fn(() => ({
        len: vi.fn().mockReturnValue(1),
        get: vi.fn(() => ({
          to_json: vi.fn(),
        })),
      })),
    })),
    TxBuilder: {
      new: vi.fn(() => ({
        build: vi.fn(() => ({
          to_json: vi.fn(() => ({ id: 'dummy_tx_id_prefix_0' })),
          id: vi.fn(() => 'dummy_tx_id_prefix_0'),
          inputs: vi.fn(() => ({
            len: vi.fn().mockReturnValue(0),
            get: vi.fn(),
          })),
          output_candidates: vi.fn(() => ({
            len: vi.fn().mockReturnValue(0),
            get: vi.fn(),
          })),
        })),
      })),
    },
    TokenId: {
      from_str: vi.fn(),
    },
    TokenAmount: {
      from_i64: vi.fn(),
    },
  };
});

// Mock other dependencies
vi.mock('./db', () => ({
  BoxDbAction: {
    getInstance: vi.fn(() => ({
      getAddressBoxes: vi.fn(async () => [
        {
          spend_tx_id: null,
          serialized: 'mock_serialized_box',
        },
      ]),
    })),
  },
}));

vi.mock('@rosen-clients/ergo-explorer', () => {
  return {
    __esModule: true,
    default: vi.fn(() => ({
      v1: {
        getApiV1Info: vi.fn().mockResolvedValue({ height: 1451335 }),
        getTx: vi.fn().mockResolvedValue({}),
      },
      getHeight: vi.fn().mockResolvedValue(1451335),
    })),
    ergoExplorerAPIv0: vi.fn(() => ({
      getHeight: vi.fn(async () => 1451335),
    })),
  };
});

vi.mock('@/utils/networks', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getChain: vi.fn(() => ({
      getNetwork: vi.fn(() => ({
        getHeight: vi.fn(async () => 1451335),
        getContext: vi.fn(async () => ({})),
      })),
      prefix: 16,
      getExplorerFront: vi.fn(() => 'https://testnet.ergoplatform.com'),
    })),
  };
});

vi.mock('./box', () => ({
  deserialize: vi.fn(() => ({
    value: () => ({
      as_i64: () => ({ to_str: () => '1000000000' }),
    }),
    tokens: () => ({
      len: () => 0,
      get: vi.fn(),
    }),
    ergo_tree: vi.fn(),
  })),
}));

vi.mock('./wallet', () => ({
  getProver: vi.fn(),
}));

import { generateTx } from './tx';
import { StateWallet } from '@/store/reducer/wallet';
import { WalletType } from '@/db/entities/Wallet';

describe('generateTx', () => {
  it('should generate a transaction with valid inputs', async () => {
    const wallet: StateWallet = {
      id: 1,
      name: 'RustTest',
      networkType: 'Main Net',
      type: WalletType.Normal,
      balance: '1000000000',
      tokens: [],
      addresses: [
        {
          address: '9hMDjzgnrwET8dweNnK3wKHJf7Vi3zWcKsFEEcdETdSie34BQ16',
          walletId: 1,
          balance: '1000000000',
          name: 'Main Address',
          tokens: [],
          idx: 0,
          path: "m/44'/429'/0'/0/0",
          proceedHeight: 1451335,
          id: 1,
        },
      ],
      xPub: 'xpub...',
      requiredSign: 1,
      seed: 'mock_seed',
      version: 1,
    };

    const addresses = [1];
    const receivers = [
      {
        address: '9hMDjzgnrwET8dweNnK3wKHJf7Vi3zWcKsFEEcdETdSie34BQ16',
        amount: 100000000n,
        tokens: [],
      },
    ];
    const fee = 1100000n;

    const { tx, boxes } = await generateTx(wallet, addresses, receivers, fee);

    expect(tx).toBeDefined();
    expect(tx.id()).toEqual('dummy_tx_id_prefix_0');
    expect(boxes).toHaveLength(1);
  });
});
