// Versets du jour : seules les références sont stockées ; le texte vient du Coran embarqué.
export const DAILY = [
  [2, 255], [2, 286], [2, 152], [2, 153], [2, 186], [2, 201], [3, 8], [3, 139], [3, 159], [3, 173],
  [9, 51], [9, 129], [11, 88], [12, 87], [13, 28], [14, 7], [15, 99], [16, 90], [16, 128], [17, 24],
  [18, 10], [20, 114], [21, 87], [24, 35], [25, 63], [29, 69], [33, 56], [39, 53], [40, 60], [49, 10],
  [49, 13], [50, 16], [55, 13], [57, 4], [59, 22], [65, 2], [65, 3], [93, 3], [94, 5], [94, 6], [112, 1], [2, 45],
];
export const verseOfDay = (dayIndex) => DAILY[((dayIndex % DAILY.length) + DAILY.length) % DAILY.length];
