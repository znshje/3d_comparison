'use client'

import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useAppDispatch, useAppSelector} from "@/lib/hooks";
import {RootState} from "@/lib/store";
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    BufferGeometry,
    Group,
    LinearSRGBColorSpace,
    NeutralToneMapping,
    Vector3,
    OrthographicCamera as OrthographicCameraType, DoubleSide
} from "three";
import {ArcballControls, Html, OrthographicCamera, useProgress, View} from "@react-three/drei";
import {readFile, readTextFile, writeFile} from "@tauri-apps/plugin-fs";
import {GLTFLoader, OBJLoader, STLLoader, PLYLoader, XYZLoader, GLTF} from "three-stdlib";
import {useDebounceEffect} from "ahooks";
import {join} from "@tauri-apps/api/path";
import {disposeObject3D} from "@/app/_lib/disposeObject3D";
import {updateCamera} from "@/lib/features/camera/cameraSlice";
import {info} from "@tauri-apps/plugin-log";
import {subscribe, unsubscribe} from "@/app/_lib/EventEmitter";

type AsciiLoaderType = OBJLoader | XYZLoader
type BinaryLoaderType = GLTFLoader | STLLoader | PLYLoader
type LoaderType = AsciiLoaderType | BinaryLoaderType
type GeometryLoaderType = STLLoader | PLYLoader

const Loader: React.FC = () => {
    const {progress} = useProgress()

    return <Html center>{progress}% loaded</Html>
}

const Model: React.FC<{ modelPath: string, loader: LoaderType }> = ({modelPath, loader}) => {
    const [model, setModel] = useState<GLTF | Group | BufferGeometry>()

    const loadModel = useCallback(async () => {
        if (!modelPath) return;

        if (loader instanceof GLTFLoader) {
            const data = await readFile(modelPath);
            const model = await loader.parseAsync(data.buffer, '')
            setModel(model)
        } else if (loader instanceof OBJLoader) {
            const data = await readTextFile(modelPath);
            const model = loader.parse(data)
            setModel(model)
        } else if (loader instanceof XYZLoader) {
            const data = await readTextFile(modelPath);
            const model = await new Promise<BufferGeometry>((resolve, reject) => {
                try {
                    loader.parse(data, geometry => resolve(geometry))
                } catch (e) {
                    reject(e)
                }
            });
            setModel(model)
        } else {
            const data = await readFile(modelPath);
            const model = (loader as GeometryLoaderType).parse(data.buffer);
            setModel(model)
        }
    }, [modelPath, loader]);

    useDebounceEffect(() => {
        loadModel()
        return () => {
            setModel(prev => {
                if (!!prev) {
                    if (prev instanceof BufferGeometry) {
                        prev.dispose()
                    } else if (prev instanceof Group) {
                        disposeObject3D(prev)
                    } else {
                        disposeObject3D((prev as GLTF).scene)
                    }
                }
                return null
            })
        }
    }, [loadModel], {
        wait: 50
    })

    if (!model) {
        return <></>
    }
    if (model instanceof BufferGeometry) {
        return <mesh geometry={model}>
            <meshPhysicalMaterial vertexColors={true} side={DoubleSide}/>
        </mesh>
    }
    return <>
        {model && <primitive object={model}/>}
    </>
}

const Lights = () => {
    return <>
        <ambientLight intensity={1 * Math.PI / 2} color="#ffffff"/>
        <directionalLight
            color="#ffffff"
            intensity={3.14 / 2.5}
            position={new Vector3(0, -150, 0)}
        />
        <directionalLight
            color="#ffffff"
            intensity={4.7 / 2.5}
            position={new Vector3(-200, 0, 0)}
        />
        <directionalLight
            color="#ffffff"
            intensity={4.7 / 2.5}
            position={new Vector3(200, 0, 0)}
        />
        <directionalLight
            color="#ffffff"
            intensity={2.3 / 2.5}
            position={new Vector3(0, 0, 200)}
        />
    </>
}

export function CameraController() {
    const dispatch = useAppDispatch()
    const cameraRef = useRef<OrthographicCameraType>(null)

    return (
        <>
            <OrthographicCamera makeDefault ref={cameraRef} position={[0, 0, 150]} zoom={5}/>
            <ArcballControls camera={cameraRef.current!} onChange={() => {
                const cam = cameraRef.current
                if (!cam) return
                dispatch(updateCamera({
                    position: [cam.position.x, cam.position.y, cam.position.z],
                    quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
                    zoom: cam.zoom,
                }))
            }}/>
        </>
    )
}

function SyncCameraFromStore() {
    const cameraState = useAppSelector((state: RootState) => state.camera)
    const {camera} = useThree()

    useFrame(() => {
        camera.position.fromArray(cameraState.position)
        camera.quaternion.fromArray(cameraState.quaternion as [number, number, number, number])
        camera.zoom = cameraState.zoom
        camera.updateProjectionMatrix()
    })

    return null
}

const Scene = ({path, loader}: { path: string, loader: LoaderType }) => {
    useFrame(({gl, scene, camera}) => {
        gl.clear(true, true, true)
        gl.render(scene, camera)
    })

    return <>
        <Lights/>
        <SyncCameraFromStore/>

        <Suspense fallback={<Loader/>}>
            <Model modelPath={path} loader={loader}/>
        </Suspense>
    </>
}

const CopyCanvas = ({renderCanvas, proxyCanvas, size: {width, height}}: {
    renderCanvas: HTMLCanvasElement,
    proxyCanvas: HTMLCanvasElement,
    size: { width: number, height: number }
}) => {
    useFrame(() => {
        if (!proxyCanvas || !renderCanvas) return

        const ctx = proxyCanvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, proxyCanvas.width, proxyCanvas.height)
        ctx.drawImage(renderCanvas, 0, 0, width, height, 0, 0, proxyCanvas.width, proxyCanvas.height);
    })

    return null
}

const ModelRenderer: React.FC = () => {
    const {workDir, selectedCandidates, selectedFile} = useAppSelector((state: RootState) => state.controls.files);
    const {renderDirection, viewportSize, gap} = useAppSelector((state: RootState) => state.controls.render);
    const {
        outputDir,
        outputToWorkdir,
        outputFormat,
        outputQuality,
        backgroundTransparent,
        renderScale
    } = useAppSelector((state: RootState) => state.controls.output);
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement>(null)

    const [modelPaths, setModelPaths] = useState<string[]>([])

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resultCanvasRef = useRef<HTMLCanvasElement>(null);

    const canvasSize = useMemo(() => ({
        width: viewportSize.width * (renderDirection === 'horizontal' ? selectedCandidates.length : 1) + (renderDirection === 'horizontal' ? gap * Math.max(0, selectedCandidates.length - 1) : 0),
        height: viewportSize.height * (renderDirection === 'vertical' ? selectedCandidates.length : 1) + (renderDirection === 'vertical' ? gap * Math.max(0, selectedCandidates.length - 1) : 0)
    }), [viewportSize, renderDirection, selectedCandidates, gap]);

    const capture = useCallback(async ({filename}: {
        filename: string
    }) => {
        return new Promise<void>((resolve, reject) => {
            try {
                resultCanvasRef.current.toBlob(
                    async (blob) => {
                        const data = await blob.arrayBuffer();
                        try {
                            await writeFile(await join(outputToWorkdir ? workDir : outputDir, filename), new Uint8Array(data));
                        } catch (e) {
                            reject(e)
                        }
                        resolve()
                    },
                    outputFormat,
                    outputQuality
                );
            } catch (e) {
                reject(e)
            }
        })
    }, [outputDir, outputFormat, outputQuality, outputToWorkdir, workDir]);

    const loader = useMemo(() => {
        if (!selectedFile) return undefined;
        const ext = selectedFile.substring(selectedFile.lastIndexOf('.') + 1).toLowerCase()
        if (ext === 'glb' || ext === 'gltf') {
            return new GLTFLoader()
        } else if (ext === 'obj') {
            return new OBJLoader()
        } else if (ext === 'stl') {
            return new STLLoader()
        } else if (ext === 'ply') {
            return new PLYLoader()
        } else if (ext === 'xyz') {
            return new XYZLoader()
        }
        return null
    }, [selectedFile]);

    const scenes = useMemo(() => modelPaths.map((path) => (
        <Scene path={path} loader={loader} key={path} />
    )), [modelPaths, loader])

    useEffect(() => {
        const captureListener = (msg: {filename: string}) => {
            info(JSON.stringify(msg))
            const {filename} = msg
            capture({filename}).then(() => {
                postMessage({
                    type: 'action/capture/complete',
                    payload: {
                        filename
                    }
                })
            })
        }

        subscribe('action/capture', captureListener)

        return () => {
            unsubscribe('action/capture', captureListener)
        }
    }, [capture]);

    useDebounceEffect(() => {
        (async () => {
            if (selectedFile && selectedCandidates) {
                const paths = []
                for (const candidate of selectedCandidates) {
                    paths.push(await join(workDir, candidate, selectedFile))
                }
                setModelPaths(paths)
            }
        })()
    }, [selectedFile], {
        wait: 50
    });

    if (loader === null) {
        return <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>不支持该文件格式：{selectedFile}</div>
    }

    return <div
        ref={containerRef}
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>

        {/*<Button onClick={capture}>截图</Button>*/}

        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            zIndex: -1,
            // opacity: 0
        }}>
            <div
                style={{
                    top: 0, left: 0,
                    width: canvasSize.width,
                    height: canvasSize.height,
                    position: 'fixed',
                    display: 'flex',
                    gap: gap, justifyContent: 'center', alignItems: 'center'
                }}>
                {modelPaths.map((_, index) => (
                    <View index={index + 1} key={index} style={{
                        width: viewportSize.width,
                        height: viewportSize.height
                    }}>
                        {scenes[index]}
                    </View>
                ))}
            </div>

            <Canvas
                ref={canvasRef}
                eventSource={containerRef}
                gl={{
                    toneMapping: NeutralToneMapping,
                    alpha: true,
                    preserveDrawingBuffer: true,
                    outputColorSpace: LinearSRGBColorSpace
                }}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    minWidth: '100vw',
                    minHeight: '100vh',
                    ...canvasSize
                }}
            >
                {backgroundTransparent ? null : <color attach="background" args={[0xffffff]}/>}
                <CameraController/>
                <CopyCanvas renderCanvas={canvasRef.current} proxyCanvas={resultCanvasRef.current} size={canvasSize}/>

                <View.Port/>
            </Canvas>
        </div>

        <canvas ref={resultCanvasRef} width={canvasSize.width} height={canvasSize.height} style={{
            maxWidth: '98%',
            height: 'auto',
            boxShadow: "0 0 5px 0 #cccccc",
        }}/>

    </div>
}

export default ModelRenderer