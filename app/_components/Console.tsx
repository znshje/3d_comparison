'use client'

import {RootState} from "@/lib/store";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {Button} from "antd";
import {clear} from "@/lib/features/console/consoleSlice";

const Console: React.FC = () => {
    const {info} = useAppSelector((state: RootState) => state.console);
    const dispatch = useAppDispatch();

    return <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
        <div style={{width: '100%', height: 24}}>
            <Button size="small" onClick={() => dispatch(clear())}>Clear</Button>
        </div>
        <div style={{flex: 1, overflow: 'auto'}}>
            {info.map((item, index) => <p key={index} style={{borderBottom: '1px solid #eee'}}>{item}</p>)}
        </div>
    </div>
}

export default Console;