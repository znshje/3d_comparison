'use client'

import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {Button, ColorPicker, Dropdown, Input, InputNumber, List, Slider, Switch, Typography} from "antd";
import {
    defaultLightConfig,
    HemisphereLightJSON,
    LightParams,
    LightShadow, PointLightJSON,
    resetLight, SpotLightJSON,
    updateLight
} from "@/lib/features/lights/lightsSlice";
import {
    DeleteOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    PlusOutlined,
    VideoCameraOutlined
} from "@ant-design/icons";
import {useMemo} from "react";

const lightNameMap = {
    'ambient': '环境光',
    'directional': '平行光',
    'hemisphere': '半球光',
    'point': '点光',
    'rectarea': '矩形光',
    'spot': '聚光灯',
}

const LightItem: React.FC<{ light: LightParams; index: number }> = ({light, index}) => {
    const dispatch = useAppDispatch()

    const castShadowSwitch = useMemo(() => {
        if (light.type === 'directional' || light.type === 'point' || light.type === 'spot') {
            return <div>
                <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                    <span style={{flex: 1}}>阴影</span>
                    <Switch size="small" checked={(light as LightShadow).castShadow} onChange={(checked) => {
                        dispatch(updateLight(state => {
                            state.lights[index].castShadow = checked
                        }))
                    }}/>
                </div>
            </div>
        }
        return null
    }, [dispatch, index, light])

    const hemisphereLightColor = useMemo(() => {
        if (light.type === 'hemisphere') {
            return <>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>天空颜色</span>
                        <ColorPicker
                            value={(light as HemisphereLightJSON).skyColor as string}
                            onChange={(value) => {
                                dispatch(updateLight(state => {
                                    state.lights[index].skyColor = value.toHexString()
                                }))
                            }}
                            format="hex"
                        />
                    </div>
                </div>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>地面颜色</span>
                        <ColorPicker
                            value={(light as HemisphereLightJSON).groundColor as string}
                            onChange={(value) => {
                                dispatch(updateLight(state => {
                                    state.lights[index].groundColor = value.toHexString()
                                }))
                            }}
                            format="hex"
                        />
                    </div>
                </div>
            </>
        }
        return null
    }, [dispatch, index, light])

    const pointLightProps = useMemo(() => {
        if (light.type === 'point') {
            return <>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>距离</span>
                        <InputNumber step={0.05} value={(light as PointLightJSON).distance} onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].distance = value
                            }))
                        }}/>
                    </div>
                    <Slider
                        value={(light as PointLightJSON).distance}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].distance = value
                            }))
                        }}
                    />
                </div>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>衰减</span>
                        <InputNumber step={0.05} value={(light as PointLightJSON).decay} onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].decay = value
                            }))
                        }}/>
                    </div>
                    <Slider
                        value={(light as PointLightJSON).decay}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].decay = value
                            }))
                        }}
                    />
                </div>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>功率</span>
                        <InputNumber step={0.05} value={(light as PointLightJSON).power} onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].power = value
                            }))
                        }}/>
                    </div>
                    <Slider
                        value={(light as PointLightJSON).power}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].power = value
                            }))
                        }}
                    />
                </div>
            </>
        }
        return null
    }, [dispatch, index, light])

    const spotLightProps = useMemo(() => {
        if (light.type === 'spot') {
            return <>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>角度</span>
                        <InputNumber step={1} value={(light as SpotLightJSON).angle} onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].angle = value * Math.PI / 180
                            }))
                        }}/>
                    </div>
                    <Slider
                        value={(light as SpotLightJSON).angle}
                        min={0}
                        max={180}
                        step={1}
                        onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].angle = value * Math.PI / 180
                            }))
                        }}
                    />
                </div>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                        <span style={{flex: 1}}>软阴影</span>
                        <InputNumber step={0.01} value={(light as SpotLightJSON).penumbra} onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].penumbra = value
                            }))
                        }}/>
                    </div>
                    <Slider
                        value={(light as SpotLightJSON).penumbra}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => {
                            dispatch(updateLight(state => {
                                state.lights[index].penumbra = value
                            }))
                        }}
                    />
                </div>
            </>
        }
        return null
    }, [dispatch, index, light])

    return <div style={{display: 'flex', width: '100%', flexDirection: 'column', gap: 8}}>
        <div style={{display: 'flex', width: '100%', alignItems: 'center', justifyItems: 'center', gap: 8}}>
            <Typography.Text style={{
                fontSize: 12,
                fontWeight:"bold",
                flex: 1
            }}>[{index + 1}] {lightNameMap[light.type]}</Typography.Text>

            <Button
                size="small"
                danger
                type="primary"
                shape="circle"
                icon={<DeleteOutlined />}
                title="删除"
                onClick={() => {
                    dispatch(updateLight(state => {
                        state.lights = state.lights.filter((_, i) => i !== index)
                    }))
                }}
            />
        </div>
        <div style={{display: 'flex', width: '100%', alignItems: 'center', justifyItems: 'center', gap: 8}}>
            <Input
                variant="filled"
                value={light.name}
                style={{flex: 1}}
                onChange={(e) => {
                    dispatch(updateLight(state => {
                        state.lights[index].name = e.target.value
                    }));
                }}
            />
            {
                ['directional', 'spot', 'point'].includes(light.type) && (
                    <Button size="small" type={light.bindView ? 'primary' : 'text'}
                            onClick={() => dispatch(updateLight(state => {
                                state.lights[index].bindView = !state.lights[index].bindView
                            }))} icon={<VideoCameraOutlined/>} shape="circle" title="绑定摄像机运动"></Button>
                )
            }

            <Button size="small" type={light.enabled ? 'primary' : 'text'}
                    onClick={() => dispatch(updateLight(state => {
                        state.lights[index].enabled = !state.lights[index].enabled
                    }))} icon={light.enabled ? <EyeOutlined/> : <EyeInvisibleOutlined/>} shape="circle"
                    title={light.enabled ? '禁用' : '启用'}></Button>
        </div>
        <div>
            <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                <span style={{flex: 1}}>强度</span>
                <InputNumber step={0.05} value={light.intensity} onChange={(value) => {
                    dispatch(updateLight(state => {
                        state.lights[index].intensity = value
                    }))
                }}/>
            </div>
            <Slider
                style={{margin: 4}}
                min={0}
                max={2}
                step={0.01}
                value={light.intensity}
                onChange={(value) => {
                    dispatch(updateLight(state => {
                        state.lights[index].intensity = value
                    }))
                }}
            />
        </div>
        <div>
            <div style={{display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%'}}>
                <span style={{flex: 1}}>颜色</span>
                <ColorPicker
                    value={light.color as string}
                    onChange={(value) => {
                        dispatch(updateLight(state => {
                            state.lights[index].color = value.toHexString()
                        }))
                    }}
                    format="hex"
                />
            </div>
        </div>
        {castShadowSwitch}
        {hemisphereLightColor}
        {pointLightProps}
        {spotLightProps}
    </div>
}

const LightsPanel: React.FC = () => {
    const {lights} = useAppSelector((state: RootState) => state.lights)
    const cameraState = useAppSelector((state: RootState) => state.camera)
    const dispatch = useAppDispatch()

    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8
    }}>
        <div style={{
            display: 'flex',
            gap: 16
        }}>
            <Dropdown
                menu={{
                    items: Object.keys(lightNameMap).map(key => ({
                        label: lightNameMap[key],
                        key: key
                    })),
                    onClick: ({key}) => {
                        const cfg = {
                            ...defaultLightConfig[key]
                        }
                        if (['directional', 'point', 'spot'].includes(key)) {
                            (cfg as LightShadow).position = cameraState.position;
                            const lookAt = cameraState.worldDirection;
                            for (let i = 0; i < 3; i++) {
                                (cfg as LightShadow).lookAt[i] = lookAt[i] + (cfg as LightShadow).position[i];
                            }
                        }
                        dispatch(updateLight(state => {
                            state.lights.push(cfg)
                        }))
                    }
                }}
                trigger={['click']}
            >
                <Button style={{flex: 1}} type="primary" onClick={() => dispatch(resetLight())}
                        icon={<PlusOutlined/>}>从相机视角添加</Button>
            </Dropdown>
            <Button danger onClick={() => dispatch(resetLight())}>重置</Button>
        </div>
        <List
            bordered
            size="small"
            dataSource={lights}
            renderItem={(item, index) => (
                <List.Item>
                    <LightItem light={item} index={index}/>
                </List.Item>
            )}
        />
    </div>
}

export default LightsPanel;