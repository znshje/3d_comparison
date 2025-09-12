'use client'

import {Button, Checkbox, Input, Space, Typography} from "antd";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {setState} from "@/lib/features/controls/controlsSlice";
import {FolderOpenOutlined} from "@ant-design/icons";
import {open} from "@tauri-apps/plugin-dialog";
import {readDir} from "@tauri-apps/plugin-fs";
import {debug, error} from "@tauri-apps/plugin-log";

const FileSelector: React.FC = () => {
    const {workDir, candidates, selectedCandidates} = useAppSelector((state: RootState) => state.controls.files);
    const dispatch = useAppDispatch();

    const loadCandidates = (root: string) => {
        if (!root) {
            return []
        }
        try {
            return readDir(root).then(files => {
                return files.filter(file => file.isDirectory || file.isSymlink).map(file => file.name)
            }).then(candidates => {
                debug(candidates.join(', '))
                dispatch(setState(state => {
                    state.files.candidates = candidates
                    state.files.selectedCandidates = candidates
                }))
            })
        } catch (e) {
            error(e)
            return []
        }
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
            <Typography.Title level={4}>选择工作目录</Typography.Title>
            <Space.Compact style={{width: '100%'}}>
                <Input
                    placeholder="选择工作目录"
                    value={workDir ?? ''}
                    onChange={(e) => dispatch(setState(state => state.files.workDir = e.target.value))}
                />
                <Button icon={<FolderOpenOutlined/>} onClick={() => {
                    open({
                        directory: true,
                    }).then((selected) => {
                        dispatch(setState(state => state.files.workDir = selected))
                        loadCandidates(selected)
                    });
                }}/>
            </Space.Compact>
        </div>
        <Button type="primary" onClick={() => loadCandidates(workDir)}>加载工作目录</Button>
        <Typography.Title level={4} style={{margin: 0}}>选择渲染目标</Typography.Title>
        <div style={{flex: 1, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, minHeight: 200}}>
            {(candidates ?? []).map((candidate, index) => (
                <Button type="text" key={index} block onClick={() => {
                    dispatch(setState(state => {
                        if (!state.files.selectedCandidates.includes(candidate)) {
                            state.files.selectedCandidates.push(candidate)
                        } else {
                            state.files.selectedCandidates = state.files.selectedCandidates.filter(c => c !== candidate)
                        }
                    }))
                }}>
                    <div style={{width: '100%', textAlign: 'start'}}><Checkbox
                        checked={selectedCandidates.includes(candidate)}>{candidate}</Checkbox></div>
                </Button>
            ))}
        </div>
        <Button type="primary" onClick={() => {
            dispatch(setState(state => state.ui.tabIndex = '1'))
        }}>下一步</Button>
    </div>
}

export default FileSelector;