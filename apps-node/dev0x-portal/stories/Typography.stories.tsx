import type { Meta, StoryObj } from "@storybook/react";

const Text = ({ className }: { className: string }) => {
  return (
    <div className={className}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </div>
  );
};

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta: Meta<typeof Text> = {
  title: "Typography",
  component: Text,
};

export default meta;
type Story = StoryObj<typeof Text>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
export const DisplayH3: Story = {
  args: {
    className: "font-sans text-5xl font-normal",
  },
};

export const DisplayH4: Story = {
  args: {
    className: "font-sans text-2.5xl font-medium",
  },
};
export const BodyXL: Story = {
  args: {
    className: "font-sans text-1.5xl font-normal",
  },
};
export const BodyL: Story = {
  args: {
    className: "font-sans text-lg font-normal",
  },
};
export const BodySlim: Story = {
  args: {
    className: "font-sans text-lg font-thin",
  },
};
export const BodyM: Story = {
  args: {
    className: "font-sans text-base font-normal",
  },
};

export const BodyMMedian: Story = {
  args: {
    className: "font-sans text-base font-medium",
  },
};
export const BodyS: Story = {
  args: {
    className: "font-sans text-sm font-normal",
  },
};
export const BodySMedian: Story = {
  args: {
    className: "font-sans text-sm font-medium",
  },
};
