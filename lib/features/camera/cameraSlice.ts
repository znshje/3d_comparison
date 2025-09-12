import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export interface CameraState {
    position: [number, number, number]
    quaternion: [number, number, number, number]
    zoom: number
}

export const initialState: CameraState = {
    position: [0, 0, 150],
    quaternion: [0, 0, 0, 1],
    zoom: 5
}

export const cameraSlice = createSlice({
    name: 'camera',
    initialState,
    reducers: {
        updateCamera: (state, action: PayloadAction<CameraState>) => {
            return { ...state, ...action.payload }
        },
    },
})

export const { updateCamera } = cameraSlice.actions
export default cameraSlice.reducer