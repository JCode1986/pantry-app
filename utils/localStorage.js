export const savePantry = (items) => {
  localStorage.setItem('pantry', JSON.stringify(items));
};

export const loadPantry = () => {
  const data = localStorage.getItem('pantry');
  return data ? JSON.parse(data) : [];
};
