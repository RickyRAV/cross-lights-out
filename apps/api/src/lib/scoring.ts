const EXACT_POSITION_POINTS = 5;
const CORRECT_DRIVER_WRONG_POSITION_POINTS = 2;

export function scorePrediction(predictedOrder: string[], actualOrder: string[]): number {
  return predictedOrder.reduce((total, driver, position) => {
    if (actualOrder[position] === driver) {
      return total + EXACT_POSITION_POINTS;
    }
    if (actualOrder.includes(driver)) {
      return total + CORRECT_DRIVER_WRONG_POSITION_POINTS;
    }
    return total;
  }, 0);
}
