
//import { /* ColumnSort, */ SortingState } from '@tanstack/react-table'

export type College = {
  id: number;
  name: string;
  location: string;
  featured: boolean;
  rating: number;
  fees: number;
  userReviewRating: number;
};




const generateCollegesData = (count: number) => {
  const data = [];
  for (let i = 1; i <= count; i++) {
    const name = `College ${i+222}`;
    const location = `City ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const featured = Math.random() < 0.5;
    const rating = parseFloat((Math.random() * 5).toFixed(1));
    const fees = Math.floor(Math.random() * 20000) + 50000;
    const userReviewRating = parseFloat((Math.random() * 5).toFixed(1));
    data.push({ id: i, name, location, featured, rating, fees, userReviewRating });
  }
  return data;
};


const data = generateCollegesData(100);


//simulates a backend api
type SortingState = { id: keyof College; desc: boolean }[];

// Simulates fetching data from a backend API
export const fetchData = async (
  start: number,
  size: number,
  sorting: SortingState
) => {
  const dbData = [...data];
  if (sorting.length) {
    const sort = sorting[0];
    const { id, desc } = sort;
    dbData.sort((a, b) => {
      if (desc) {
        return a[id] < b[id] ? 1 : -1;
      }
      return a[id] > b[id] ? 1 : -1;
    });
  }

  // Simulate a delay to mimic API latency
  await new Promise(resolve => setTimeout(resolve, 200));

  return {
    data: dbData.slice(start, start + size),
    meta: {
      totalRowCount: dbData.length,
    },
  };
};
