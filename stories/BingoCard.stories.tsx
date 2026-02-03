import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BingoCard } from "@/components/bingo/bingo-card";

const meta = {
  title: "Business Components/Bingo/BingoCard",
  component: BingoCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BingoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample bingo card numbers
const sampleCard = [
  [1, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, 0, 48, 63], // 0 is FREE SPACE
  [4, 19, 33, 49, 64],
  [5, 20, 34, 50, 65],
];

export const Empty: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set(),
    readonly: false,
  },
};

export const WithFewCalls: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 16, 31, 32]),
    readonly: false,
  },
};

export const AlmostBingo: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 2, 3, 4]),
    readonly: false,
  },
};

export const WithBingoLine: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 2, 3, 4, 5]),
    bingoLines: [
      {
        type: "column",
        index: 0,
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
        ],
      },
    ],
    readonly: false,
  },
};

export const MultipleBingoLines: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 2, 3, 4, 5, 16, 17, 18, 19, 20]),
    bingoLines: [
      {
        type: "column",
        index: 0,
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
        ],
      },
      {
        type: "column",
        index: 1,
        cells: [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
        ],
      },
    ],
    readonly: false,
  },
};

export const ReadOnly: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 16, 31, 46, 61]),
    bingoLines: [
      {
        type: "row",
        index: 0,
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
          [0, 4],
        ],
      },
    ],
    readonly: true,
  },
};

export const DiagonalBingo: Story = {
  args: {
    cardNumbers: sampleCard,
    calledNumbers: new Set([1, 17, 0, 49, 65]),
    bingoLines: [
      {
        type: "diagonal",
        index: 0,
        cells: [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
        ],
      },
    ],
    readonly: false,
  },
};
