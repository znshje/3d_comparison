'use client'

import {Button, Input, Radio, Typography} from "antd"
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {setState} from "@/lib/features/controls/controlsSlice";
import {closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import {useEffect, useState} from "react";
import {FileTextOutlined, MenuOutlined, PercentageOutlined} from "@ant-design/icons";
import {useDebounceEffect} from "ahooks";
import {readDir} from "@tauri-apps/plugin-fs";
import {join} from "@tauri-apps/api/path";
import {error} from "@tauri-apps/plugin-log";

interface Item {
    id: number;
    text: string;
}

interface DraggableTagProps {
    item: Item;
}

const commonStyle: React.CSSProperties = {
    cursor: 'move',
    transition: 'unset', // Prevent element from shaking after drag
};

const RenderTargetTag: React.FC<DraggableTagProps> = ({item}) => {
    const {listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: item.id});
    const style = transform
        ? {
            ...commonStyle,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            transition: isDragging ? 'unset' : transition, // Improve performance/visual effect when dragging
        }
        : commonStyle;

    return (
        <Button type="text" block style={style} ref={setNodeRef} {...listeners} icon={<MenuOutlined/>}>
            <div style={{width: '100%', textAlign: 'start'}}>{item.text}</div>
        </Button>
    );
}

function antToRegex(pattern: string): RegExp {
    // 转义正则特殊字符，但保留 * 和 ?
    const escapeRegex = (s) =>
        s.replace(/[.+^${}()|[\]\\]/g, "\$&");

    let regex = escapeRegex(pattern);

    // 先处理 **，再处理 * 和 ?
    regex = regex
        .replace(/\*\*/g, ".*")   // ** => 任意多路径
        .replace(/\*/g, "[^/]*")   // *  => 单路径，不跨 /
        .replace(/\?/g, "[^/]");   // ?  => 单字符，不跨 /

    return new RegExp(regex);
}

const RenderAssigns: React.FC = () => {
    const {
        workDir,
        selectedCandidates,
        filePattern,
        isFilePatternRegExp,
        availableFiles
    } = useAppSelector((state: RootState) => state.controls.files);
    const {renderDirection} = useAppSelector((state: RootState) => state.controls.render);
    const [items, setItems] = useState<Item[]>(selectedCandidates.map((item, index) => ({id: index, text: item})))
    const dispatch = useAppDispatch()

    const sensors = useSensors(useSensor(PointerSensor))

    useEffect(() => {
        dispatch(setState(state => state.files.selectedCandidates = items.map(item => item.text)))
    }, [items, dispatch]);

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (!over) {
            return;
        }
        if (active.id !== over.id) {
            setItems((data) => {
                const oldIndex = data.findIndex((item) => item.id === active.id);
                const newIndex = data.findIndex((item) => item.id === over.id);
                return arrayMove(data, oldIndex, newIndex);
            });
        }
    }

    useDebounceEffect(() => {
        (async () => {
            let pattern: RegExp
            if (!filePattern || filePattern.trim().length === 0) {
                pattern = new RegExp(/.*/)
            } else if (isFilePatternRegExp) {
                try {
                    pattern = new RegExp(filePattern)
                } catch (e) {
                    error(e)
                    return
                }
            } else {
                pattern = antToRegex(filePattern)
            }

            const validFiles = []
            for (const candidate of selectedCandidates) {
                const dir = await join(workDir, candidate);
                const files = await readDir(dir);
                for (const file of files) {

                    if (file.isFile && file.name.match(pattern)) {
                        if (!validFiles.includes(file.name)) validFiles.push(file.name);
                    }
                }
            }
            validFiles.sort()
            dispatch(setState(state => state.files.availableFiles = validFiles))
        })()
    }, [dispatch, isFilePatternRegExp, filePattern], {
        wait: 1000
    })

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            boxSizing: 'border-box'
        }}>
            <Typography.Title level={4} style={{margin: 0}}>顺序编排</Typography.Title>
            <div style={{
                flex: 1,
                overflowY: 'hidden',
                overflowX: 'hidden',
                border: '1px solid #eee',
                borderRadius: 8,
                minHeight: 200
            }}>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        {items.map<React.ReactNode>((item) => (
                            <RenderTargetTag item={item} key={item.id}/>
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
            <Typography.Title level={4} style={{margin: 0}}>文件过滤</Typography.Title>
            <Input value={filePattern} onChange={e => {
                dispatch(setState(state => {
                    state.files.filePattern = e.target.value
                }))
            }} placeholder="条件（支持正则表达式）" suffix={
                <Button
                    type="text"
                    shape="circle"
                    icon={<PercentageOutlined style={{color: isFilePatternRegExp ? '#1170ff' : 'grey'}}/>}
                    onClick={() => {
                        dispatch(setState(state => {
                            state.files.isFilePatternRegExp = !state.files.isFilePatternRegExp
                        }))
                    }}
                />
            }/>
            <div style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid #eee',
                borderRadius: 8,
                minHeight: 80,
                maxHeight: 400
            }}>
                {availableFiles.map<React.ReactNode>((name, index) => (
                    <Button type="text" block key={index} icon={<FileTextOutlined/>}>
                        <div style={{width: '100%', textAlign: 'start'}}>{name}</div>
                    </Button>
                ))}
            </div>

            <Typography.Title level={4} style={{margin: 0}}>排布方向</Typography.Title>
            <Radio.Group value={renderDirection} onChange={e => {
                dispatch(setState(state => state.render.renderDirection = e.target.value))
            }}>
                <Radio value="horizontal">水平</Radio>
                <Radio value="vertical">垂直</Radio>
            </Radio.Group>

            <div>
            <Button block type="default" onClick={() => {
                dispatch(setState(state => state.ui.tabIndex = '0'))
            }}>上一步</Button>
            </div>
            <div>
            <Button block type="primary" onClick={() => {
                dispatch(setState(state => state.ui.tabIndex = '2'))
            }}>下一步</Button>
            </div>
        </div>
    )
}

export default RenderAssigns
