// Ethiopian Calendar utilities

export const ethiopianMonths = [
  'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'
];

// Convert Gregorian date to Ethiopian date
export const gregorianToEthiopian = (gregorianDate) => {
  const date = new Date(gregorianDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Ethiopian New Year (Meskerem 1) starts on September 11 (or Sept 12 in leap years)
  const ethNewYear = new Date(year, 8, 11); // September 11
  const isGregorianLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  if (isGregorianLeap) {
    ethNewYear.setDate(12); // September 12 in Gregorian leap years
  }

  let ethYear, ethMonth, ethDay;

  if (date >= ethNewYear) {
    // After Ethiopian New Year
    ethYear = year - 7;
  } else {
    // Before Ethiopian New Year
    ethYear = year - 8;
  }

  // Calculate days from Ethiopian New Year
  const daysFromEthNewYear = Math.floor((date - ethNewYear) / (1000 * 60 * 60 * 24));

  if (daysFromEthNewYear >= 0) {
    // After Ethiopian New Year
    ethMonth = Math.floor(daysFromEthNewYear / 30);
    ethDay = (daysFromEthNewYear % 30) + 1;

    if (ethMonth >= 12) {
      // Pagumen month (13th month with 5-6 days)
      ethMonth = 12;
      ethDay = daysFromEthNewYear - 360 + 1;
    }
  } else {
    // Before Ethiopian New Year (in previous Ethiopian year)
    const prevYearDays = 365 + daysFromEthNewYear;
    ethMonth = Math.floor(prevYearDays / 30);
    ethDay = (prevYearDays % 30) + 1;

    if (ethMonth >= 12) {
      ethMonth = 12;
      ethDay = prevYearDays - 360 + 1;
    }
  }

  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    monthName: ethiopianMonths[ethMonth]
  };
};

// Convert Ethiopian date to Gregorian date
export const ethiopianToGregorian = (ethYear, ethMonth, ethDay) => {
  // Ethiopian year starts on Sept 11 (or Sept 12 in leap year)
  const gregorianYear = ethYear + 7;
  const isGregorianLeap = (gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || (gregorianYear % 400 === 0);

  // Calculate Ethiopian New Year date
  const ethNewYearDay = isGregorianLeap ? 12 : 11;
  const ethNewYear = new Date(gregorianYear, 8, ethNewYearDay); // September 11 or 12

  // Calculate total days from Ethiopian New Year
  const totalDays = (ethMonth * 30) + (ethDay - 1);

  // Add days to Ethiopian New Year
  const gregorianDate = new Date(ethNewYear);
  gregorianDate.setDate(gregorianDate.getDate() + totalDays);

  return gregorianDate;
};

// Format Ethiopian date as string
export const formatEthiopianDate = (ethDate) => {
  return `${ethDate.day} ${ethDate.monthName} ${ethDate.year}`;
};

// Get current Ethiopian date
export const getCurrentEthiopianDate = () => {
  return gregorianToEthiopian(new Date());
};

// Generate array of years
export const getEthiopianYears = (count = 10) => {
  const currentEthYear = getCurrentEthiopianDate().year;
  const years = [];
  for (let i = 0; i < count; i++) {
    years.push(currentEthYear - i);
  }
  return years;
};

// Generate array of days for a month
export const getDaysInEthiopianMonth = (month) => {
  // First 12 months have 30 days, Pagumen (13th month) has 5-6 days
  if (month < 12) {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  } else {
    return Array.from({ length: 6 }, (_, i) => i + 1);
  }
};
