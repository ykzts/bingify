import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BingoCard } from "@/components/bingo/bingo-card";

const meta = {
  component: BingoCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Business Components/Bingo/BingoCard",
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
    calledNumbers: new Set(),
    cardNumbers: sampleCard,
    readonly: false,
  },
};

export const WithFewCalls: Story = {
  args: {
    calledNumbers: new Set([1, 16, 31, 32]),
    cardNumbers: sampleCard,
    readonly: false,
  },
};

export const AlmostBingo: Story = {
  args: {
    calledNumbers: new Set([1, 2, 3, 4]),
    cardNumbers: sampleCard,
    readonly: false,
  },
};

export const WithBingoLine: Story = {
  args: {
    bingoLines: [
      {
        index: 0,
        positions: [
          { col: 0, row: 0 },
          { col: 0, row: 1 },
          { col: 0, row: 2 },
          { col: 0, row: 3 },
          { col: 0, row: 4 },
        ],
        type: "vertical",
      },
    ],
    calledNumbers: new Set([1, 2, 3, 4, 5]),
    cardNumbers: sampleCard,
    readonly: false,
  },
};

export const MultipleBingoLines: Story = {
  args: {
    bingoLines: [
      {
        index: 0,
        positions: [
          { col: 0, row: 0 },
          { col: 0, row: 1 },
          { col: 0, row: 2 },
          { col: 0, row: 3 },
          { col: 0, row: 4 },
        ],
        type: "vertical",
      },
      {
        index: 1,
        positions: [
          { col: 1, row: 0 },
          { col: 1, row: 1 },
          { col: 1, row: 2 },
          { col: 1, row: 3 },
          { col: 1, row: 4 },
        ],
        type: "vertical",
      },
    ],
    calledNumbers: new Set([1, 2, 3, 4, 5, 16, 17, 18, 19, 20]),
    cardNumbers: sampleCard,
    readonly: false,
  },
};

export const ReadOnly: Story = {
  args: {
    bingoLines: [
      {
        index: 0,
        positions: [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
          { col: 2, row: 0 },
          { col: 3, row: 0 },
          { col: 4, row: 0 },
        ],
        type: "horizontal",
      },
    ],
    calledNumbers: new Set([1, 16, 31, 46, 61]),
    cardNumbers: sampleCard,
    readonly: true,
  },
};

export const DiagonalBingo: Story = {
  args: {
    bingoLines: [
      {
        index: 0,
        positions: [
          { col: 0, row: 0 },
          { col: 1, row: 1 },
          { col: 2, row: 2 },
          { col: 3, row: 3 },
          { col: 4, row: 4 },
        ],
        type: "diagonal",
      },
    ],
    calledNumbers: new Set([1, 17, 0, 49, 65]),
    cardNumbers: sampleCard,
    readonly: false,
  },
};
