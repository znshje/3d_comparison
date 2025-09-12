'use client'

import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {Button, Checkbox, Input, InputNumber, Select, Slider, Space, Typography} from "antd";
import {setState} from "@/lib/features/controls/controlsSlice";
import {FolderOpenOutlined, SaveOutlined} from "@ant-design/icons";
import {open} from "@tauri-apps/plugin-dialog";
import {writeFile} from "@tauri-apps/plugin-fs";
import {join} from "@tauri-apps/api/path";

const OutputOptions: React.FC = () => {
    const {workDir, selectedFile} = useAppSelector((state: RootState) => state.controls.files);
    const {
        outputDir,
        outputToWorkdir,
        outputFormat,
        outputQuality,
        backgroundTransparent,
        outputFilenameFormat,
        renderScale
    } = useAppSelector((state: RootState) => state.controls.output);
    const {availableFiles} = useAppSelector((state: RootState) => state.controls.files);
    const dispatch = useAppDispatch();

    const formatFilename = (filename: string) => {
        const ext = outputFormat;
        const modelName = filename.indexOf('.') === -1 ? filename : filename.substring(0, filename.lastIndexOf('.'))
        return outputFilenameFormat.replace('%name', modelName).replace('%ext', ext);
    }

    const handleSave = async () => {
        await writeFile(await join(workDir, formatFilename(selectedFile)), new Uint8Array(), {})
    }

    return (
        <div style={{
            width: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            boxSizing: 'border-box'
        }}>
            <div>
                <Typography.Title level={4}>输出目录</Typography.Title>
                <Space.Compact style={{width: '100%'}}>
                    <Input
                        placeholder="选择输出目录"
                        disabled={outputToWorkdir}
                        value={outputToWorkdir ? workDir : outputDir}
                        onChange={(e) => dispatch(setState(state => state.output.outputDir = e.target.value))}
                    />
                    <Button icon={<FolderOpenOutlined/>} onClick={() => {
                        open({
                            directory: true,
                        }).then((selected) => {
                            dispatch(setState(state => state.output.outputDir = selected))
                        });
                    }} disabled={outputToWorkdir}/>
                </Space.Compact>
                <Checkbox checked={outputToWorkdir}
                          onChange={(e) => dispatch(setState(state => state.output.outputToWorkdir = e.target.checked))}
                          style={{marginTop: 8}}>输出到工作目录</Checkbox>
            </div>
            <div>
                <Typography.Title level={4}>输出格式</Typography.Title>
                <Select style={{width: '100%'}} options={[
                    {
                        label: 'jpg',
                        value: 'jpg'
                    },
                    {
                        label: 'png',
                        value: 'png'
                    }
                ]} value={outputFormat} onChange={e => dispatch(setState(state => state.output.outputFormat = e))}/>
                {outputFormat === 'png' ? <Checkbox checked={backgroundTransparent}
                                                    onChange={(e) => dispatch(setState(state => state.output.backgroundTransparent = e.target.checked))}
                                                    style={{marginTop: 8}}>背景透明</Checkbox> : <></>}
            </div>
            <div style={{margin: '0 16px'}}>
                <Typography.Text>输出质量：{outputQuality}</Typography.Text>
                <Slider
                    min={1}
                    max={100}
                    value={outputQuality}
                    onChange={(e) => dispatch(setState(state => state.output.outputQuality = e))}
                    style={{width: '100%', marginTop: 8}}
                />
            </div>
            <InputNumber
                min={0}
                max={100}
                value={renderScale}
                precision={1}
                addonBefore={'输出缩放'}
                onChange={(e) => dispatch(setState(state => state.output.renderScale = e))}
                style={{width: '100%'}}
            />
            <div>
                <Typography.Title level={4}>文件命名</Typography.Title>
                <Input
                    placeholder="%name.%ext"
                    value={outputFilenameFormat}
                    onChange={(e) => dispatch(setState(state => state.output.outputFilenameFormat = e.target.value))}
                />
                <Typography.Text type="secondary"
                                 style={{fontSize: 12}}>解析示例：{formatFilename(selectedFile ?? 'model.obj')}</Typography.Text>
            </div>
            <Typography.Title level={4} style={{margin: 0}}>选择模型</Typography.Title>
            <div style={{flex: 1, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, minHeight: 200}}>
                {(availableFiles ?? []).map((file, index) => (
                    <Button type={selectedFile === file ? 'primary' : 'text'} key={index} block onClick={() => {
                        dispatch(setState(state => {
                            state.files.selectedFile = file
                        }))
                    }}>
                        <div style={{width: '100%', textAlign: 'start'}}><Checkbox
                            checked={selectedFile === file}>{file}</Checkbox></div>
                    </Button>
                ))}
            </div>
            <div>
                <Button block type="primary" icon={<SaveOutlined/>} disabled={!selectedFile} onClick={handleSave}>保存</Button>
            </div>
        </div>
    )
}

export default OutputOptions;