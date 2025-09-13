'use client'

import {Collapse, CollapseProps, InputNumber, Select, Space, theme, Typography} from "antd"
import {RootState} from "@/lib/store";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {setState} from "@/lib/features/controls/controlsSlice";
import {CaretRightOutlined} from "@ant-design/icons";
import LightsPanel from "@/app/_components/LightsPanel";
import CameraPanel from "@/app/_components/CameraPanel";
import MaterialPanel from "@/app/_components/MaterialPanel";

const ViewportPanel: React.FC = () => {
    const {viewportSize, gap} = useAppSelector((state: RootState) => state.controls.render);
    const dispatch = useAppDispatch()

    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8
    }}>
        <Space.Compact>
            <InputNumber value={viewportSize.width} onChange={value => {
                dispatch(setState(state => {
                    state.render.viewportSize.width = value
                }))
            }} addonBefore="宽度" suffix="px"/>
            <InputNumber value={viewportSize.height} onChange={value => {
                dispatch(setState(state => {
                    state.render.viewportSize.height = value
                }))
            }} addonBefore="高度" suffix="px"/>
        </Space.Compact>
        <InputNumber value={gap} onChange={value => {
            dispatch(setState(state => {
                state.render.gap = value
            }))
        }} addonBefore="间距" suffix="px"/>
    </div>
}

const getPanelItems: (panelStyle: React.CSSProperties) => CollapseProps['items'] = (panelStyle) => [
    {
        key: 'viewport',
        label: '视口',
        children: <ViewportPanel/>,
        style: panelStyle
    }, {
        key: 'camera',
        label: '相机',
        children: <CameraPanel />,
        style: panelStyle
    }, {
        key: 'light',
        label: '灯光',
        children: <LightsPanel />,
        style: panelStyle
    }, {
        key: 'material',
        label: '材质',
        children: <MaterialPanel />,
        style: panelStyle
    }
]

const RenderOptions: React.FC = () => {
    const {availableFiles, selectedFile} = useAppSelector((state: RootState) => state.controls.files);
    const dispatch = useAppDispatch();

    const {token} = theme.useToken()

    const panelStyle: React.CSSProperties = {
        marginBottom: 16,
        border: 'none',
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter
    }

    return <div style={{
        width: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        boxSizing: 'border-box'
    }}>
        <div>
            <Typography.Title level={4}>选择模型</Typography.Title>
            <Select options={(availableFiles ?? []).map(file => ({
                label: file,
                value: file
            }))} value={selectedFile} onChange={value => {
                dispatch(setState(state => {
                    state.files.selectedFile = value
                }))
            }} style={{width: '100%'}}/>
        </div>
        <div>
            <Typography.Title level={4}>渲染控制</Typography.Title>
            <Collapse
                bordered={false}
                items={getPanelItems(panelStyle)}
                expandIcon={({isActive}) => <CaretRightOutlined rotate={isActive ? 90 : 0}/>}
                style={{background: token.colorBgContainer}}
            />
        </div>
    </div>
}

export default RenderOptions;