'use client'

import {Tabs} from "antd";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import FileSelector from "@/app/_components/FileSelector";
import {setState} from "@/lib/features/controls/controlsSlice";
import RenderOptions from "@/app/_components/RenderOptions";
import RenderAssigns from "@/app/_components/RenderAssigns";
import OutputOptions from "@/app/_components/OutputOptions";

const AppBar: React.FC = () => {
    const {tabIndex} = useAppSelector((state: RootState) => state.controls.ui);
    const dispatch = useAppDispatch();

    return <div style={{height: 48, padding: '0 16px'}}>
        <Tabs activeKey={tabIndex} items={[
            {
                label: `工作目录`,
                key: '0',
                children: <FileSelector />,
            },
            {
                label: `渲染编排`,
                key: '1',
                children: <RenderAssigns />,
            },
            {
                label: `渲染选项`,
                key: '2',
                children: <RenderOptions />,
            },
            {
                label: `输出`,
                key: '3',
                children: <OutputOptions />,
            }
        ]} onChange={key => dispatch(setState(state => state.ui.tabIndex = key))} />
    </div>
}

export default AppBar;