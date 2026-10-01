import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ListState {
  items: string[];
}
const initialState: ListState = {
  items: [],
};
const listSlice = createSlice({
  name: "list",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push(action.payload);
    },
  },
});

export const { addItem } = listSlice.actions;
export default listSlice.reducer;
