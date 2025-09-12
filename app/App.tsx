'use client'

import {Splitter} from "antd";
import AppBar from "@/app/_components/AppBar";
import FileSelector from "@/app/_components/FileSelector";
import ModelRenderer from "@/app/_components/ModelRenderer";
import {useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {useMemo} from "react";
import RenderOptions from "@/app/_components/RenderOptions";
import RenderAssigns from "@/app/_components/RenderAssigns";
import OutputOptions from "@/app/_components/OutputOptions";

const App: React.FC = () => {
    const {tabIndex} = useAppSelector((state: RootState) => state.controls.ui);

    const toolPanel = useMemo(() => {
        if (tabIndex === '0') {
            return <FileSelector />
        } else if (tabIndex === '1') {
            return <RenderAssigns />
        } else if (tabIndex === '2') {
            return <RenderOptions />
        } else if (tabIndex === '3') {
            return <OutputOptions />
        }
    }, [tabIndex])

    return <Splitter lazy style={{width: '100vw', height: '100vh'}} layout="vertical">
        <Splitter.Panel defaultSize={48} max={48} min={48}>
            <AppBar />
        </Splitter.Panel>
        <Splitter.Panel>
            <Splitter lazy layout="horizontal">
                <Splitter.Panel defaultSize="20%" min={200}>
                    {toolPanel}
                </Splitter.Panel>
                <Splitter.Panel defaultSize="80%" min={400}>
                    <ModelRenderer />
                </Splitter.Panel>
            </Splitter>
        </Splitter.Panel>
        {/*<Splitter.Panel defaultSize={300} collapsible={true}>*/}
        {/*    <Console />*/}
        {/*</Splitter.Panel>*/}
    </Splitter>
}

export default App;