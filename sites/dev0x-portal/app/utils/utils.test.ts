import { generateNumbersArray } from "./utils";

test("should generate array of numbers", () => {

  const n = 3;
  const result = generateNumbersArray(n)

  expect(result.length).toBe(n);

  for (let index = 0; index < result.length; index++) {
    expect(result[index]).toBe(index)

  }

});
