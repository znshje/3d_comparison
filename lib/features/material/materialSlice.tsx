import {createSlice, PayloadAction} from "@reduxjs/toolkit";

type MaterialState = {
    vertexColors: boolean
}

export const initialState: MaterialState = {
    vertexColors: true
}

export const materialSlice = createSlice({
    name: 'material',
    initialState,
    reducers: {
        setMaterial: (state, action: PayloadAction<MaterialState>) => {
            return { ...action.payload }
        }
    },
})

export const { setMaterial } = materialSlice.actions
export default materialSlice.reducer