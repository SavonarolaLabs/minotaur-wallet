import { describe, it, expect, vi } from 'vitest';
import * as wasm from 'ergo-lib-wasm-browser';
import { generateTx } from './tx'; // Adjust the path based on your project structure
import { BoxDbAction } from './db';
import { getChain } from '@/utils/networks';
import { StateWallet } from '@/store/reducer/wallet';

// Mock external dependencies
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

vi.mock('@/utils/networks', () => ({
  getChain: vi.fn(() => ({
    getNetwork: vi.fn(() => ({
      getHeight: vi.fn(async () => 1451335),
    })),
  })),
}));

vi.mock('./box', () => ({
  deserialize: vi.fn(() => ({
    value: () => ({
      as_i64: () => ({
        to_str: () => '1000000000',
      }),
    }),
    tokens: () => ({
      len: () => 0,
      get: vi.fn(),
    }),
  })),
}));

vi.mock('./wallet', () => ({
  getProver: vi.fn(),
}));

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
    expect(boxes).toHaveLength(1);
    expect(boxes[0].box_id().to_str()).toBe('a2376567a4627f4d6c6ce84723439a4b40236bb8cf4ac73cfae859e1481b42ac');
  });
});
