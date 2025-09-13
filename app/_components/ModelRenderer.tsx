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
    OrthographicCamera as OrthographicCameraType, DoubleSide, Vector3, Object3D, ObjectLoader,
    Light
} from "three";
import {Html, OrthographicCamera, useProgress, View, ArcballControls} from "@react-three/drei";
import {readFile, readTextFile, writeFile} from "@tauri-apps/plugin-fs";
import {GLTFLoader, OBJLoader, STLLoader, PLYLoader, XYZLoader, GLTF, ArcballControls as ArcballControlsImpl} from "three-stdlib";
import {useDebounceEffect} from "ahooks";
import {join} from "@tauri-apps/api/path";
import {disposeObject3D} from "@/app/_lib/disposeObject3D";
import {updateCamera} from "@/lib/features/camera/cameraSlice";
import {error, info} from "@tauri-apps/plugin-log";
import {subscribe, unsubscribe} from "@/app/_lib/EventEmitter";
import {
    DirectionalLightJSON,
    HemisphereLightJSON,
    LightParams, LightShadow,
    PointLightJSON, RectAreaLightJSON, SpotLightJSON
} from "@/lib/features/lights/lightsSlice";
import {Select, Typography} from "antd";
import {setState} from "@/lib/features/controls/controlsSlice";

type AsciiLoaderType = OBJLoader | XYZLoader
type BinaryLoaderType = GLTFLoader | STLLoader | PLYLoader
type LoaderType = AsciiLoaderType | BinaryLoaderType

interface ModelCacheItem {
    model: GLTF | Group | BufferGeometry,
    path: string
}

const Loader: React.FC = () => {
    const {progress} = useProgress()

    return <Html center>{progress}% loaded</Html>
}

const Model: React.FC<{
    index: number,
    modelPath: string,
    loader: LoaderType,
    modelCache: Map<number, ModelCacheItem>
}> = ({index, modelPath, loader, modelCache}) => {
    const [model, setModel] = useState<GLTF | Group | BufferGeometry>()
    const objectLoader = useMemo(() => new ObjectLoader(), [])

    const loadModel = useCallback(async () => {
        if (!modelPath) return;
        const cacheItem = modelCache.get(index)
        if (cacheItem && cacheItem.path === modelPath) {
            info(`model ${modelPath} already loaded, use cache`)
            setModel(cacheItem.model)
            return
        } else if (cacheItem) {
            info(`model ${modelPath} dispose cache`)
            const prev = cacheItem.model
            if (prev instanceof BufferGeometry) {
                prev.dispose()
            } else if (prev instanceof Group) {
                disposeObject3D(prev)
            } else {
                disposeObject3D((prev as GLTF).scene)
            }
            modelCache.delete(index)
        }

        let data: string | Uint8Array
        if (loader instanceof GLTFLoader) {
            const model = await loader.parseAsync((await readFile(modelPath)).buffer, '')
            setModel(model)
            modelCache.set(index, {model, path: modelPath})
            return
        } else if (loader instanceof OBJLoader) {
            data = await readTextFile(modelPath);
        } else if (loader instanceof XYZLoader) {
            data = await readTextFile(modelPath);
        } else {
            data = await readFile(modelPath);
        }

        const worker = new Worker(new URL('@/app/_lib/workers/modelParser.worker', import.meta.url));
        const modelData = await new Promise<GLTF | Group | BufferGeometry>((resolve, reject) => {
            worker.addEventListener('message', e => {
                if (e.data.type === 'result') {
                    resolve(e.data.result);
                } else if (e.data.type === 'error') {
                    reject(e.data.error);
                }
            });
            if (data instanceof Uint8Array) {
                worker.postMessage({
                    call: 'parseModel',
                    args: [modelPath, data]
                }, [data.buffer]);
            } else {
                worker.postMessage({
                    call: 'parseModel',
                    args: [modelPath, data]
                });
            }
        }).finally(() => {
            worker.terminate();
        });

        objectLoader.parseAsync(modelData).then(model => {
            setModel(model as GLTF | Group | BufferGeometry)
            modelCache.set(index, {model: model as GLTF | Group | BufferGeometry, path: modelPath})
            info(`model ${modelPath} stored to cache`)
        })
    }, [modelPath, modelCache, index, loader, objectLoader]);

    useDebounceEffect(() => {
        try {
            loadModel()
        } catch (e) {
            error(`load model failed: ${e}`)
            setModel(null)
        }
        return () => {
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

const LightObject = ({light}: { light: LightParams }) => {
    const lightRef = useRef<Light>(null)
    const vec3 = useRef(new Vector3())

    useEffect(() => {
        if (lightRef.current && !light.bindView) {
            if (['directional', 'spot', 'point'].includes(light.type)) {
                lightRef.current.position.fromArray((light as LightShadow).position)
                if (typeof lightRef.current.lookAt === 'function') {
                    if ((light as LightShadow).lookAt) {
                        lightRef.current.lookAt((light as LightShadow).lookAt[0], (light as LightShadow).lookAt[1], (light as LightShadow).lookAt[2])
                    } else {
                        lightRef.current.lookAt(0, 0, 0)
                    }
                }
            }
        }
    }, [light, light.bindView]);

    useFrame(({camera}) => {
        if (lightRef.current && light.bindView) {
            lightRef.current.position.copy(camera.position)
            if (typeof lightRef.current.lookAt === 'function') {
                camera.getWorldDirection(vec3.current)
                vec3.current.add(camera.position)
                lightRef.current.lookAt(vec3.current)
            }
        }
    })

    switch (light.type) {
        case 'ambient':
            return <ambientLight ref={lightRef} intensity={light.intensity * Math.PI} color={light.color}
                                 visible={light.enabled}/>
        case 'directional':
            const directional = (light as DirectionalLightJSON)
            return <directionalLight
                ref={lightRef}
                visible={light.enabled}
                intensity={directional.intensity * Math.PI}
                color={directional.color}
                position={directional.position}
                lookAt={directional.lookAt}
                castShadow={directional.castShadow}
            />
        case 'hemisphere':
            const hemisphere = (light as HemisphereLightJSON)
            return <hemisphereLight
                ref={lightRef}
                args={[hemisphere.skyColor, hemisphere.groundColor, hemisphere.intensity * Math.PI]}
                visible={light.enabled}
            />
        case 'point':
            const point = (light as PointLightJSON)
            return <pointLight
                ref={lightRef}
                intensity={point.intensity * Math.PI}
                position={point.position}
                color={point.color}
                distance={point.distance}
                decay={point.decay}
                castShadow={point.castShadow}
                visible={light.enabled}
            />
        case 'rectarea':
            const rectarea = (light as RectAreaLightJSON)
            return <rectAreaLight
                ref={lightRef}
                intensity={rectarea.intensity * Math.PI}
                color={rectarea.color}
                width={rectarea.width}
                height={rectarea.height}
                visible={light.enabled}
            />
        case 'spot':
            const spot = (light as SpotLightJSON)
            return <spotLight
                ref={lightRef}
                intensity={spot.intensity * Math.PI}
                position={spot.position}
                color={spot.color}
                distance={spot.distance}
                angle={spot.angle}
                penumbra={spot.penumbra}
                castShadow={spot.castShadow}
                visible={light.enabled}
            />
        default:
            return <></>
    }
}

const Lights = () => {
    const {lights} = useAppSelector((state: RootState) => state.lights)
    return <>
        {lights.map((light, index) => <LightObject light={light} key={index}/>)}
    </>
}

export function CameraController() {
    const dispatch = useAppDispatch()
    const cameraState = useAppSelector((state: RootState) => state.camera)
    const cameraRef = useRef<OrthographicCameraType>(null)
    const controlsRef = useRef<ArcballControlsImpl>(null)
    const v3 = useRef(new Vector3())

    const {controls, camera} = useThree()

    useEffect(() => {
        if (cameraState.controlUpdateRequired) {
            if (!camera) return

            const originWorld = camera.matrixWorldAutoUpdate
            const origin = camera.matrixAutoUpdate
            camera.matrixAutoUpdate = false
            camera.matrixWorldAutoUpdate = false

            camera.position.fromArray(cameraState.position)
            camera.quaternion.fromArray(cameraState.quaternion as [number, number, number, number]);
            camera.zoom = cameraState.zoom;
            camera.up.copy(Object3D.DEFAULT_UP)
            camera.updateProjectionMatrix();

            camera.updateMatrix();
            camera.updateMatrixWorld(true);

            camera.matrixAutoUpdate = origin;
            camera.matrixWorldAutoUpdate = originWorld;

            controlsRef.current.reset()
            // @ts-expect-error setCamera is not private in original three.js
            controlsRef.current.setCamera(camera)
        }
    }, [camera, cameraState.controlUpdateRequired, cameraState.position, cameraState.quaternion, cameraState.zoom, controls]);

    return (
        <>
            <OrthographicCamera makeDefault ref={cameraRef} position={[0, 0, 150]} zoom={5}/>
            <ArcballControls makeDefault ref={controlsRef} camera={cameraRef.current!} onChange={() => {
                const cam = cameraRef.current
                if (!cam) return

                camera.getWorldDirection(v3.current);
                dispatch(updateCamera({
                    position: [cam.position.x, cam.position.y, cam.position.z],
                    quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
                    zoom: cam.zoom,
                    worldDirection: v3.current.toArray()
                }))
            }}/>
        </>
    )
}

function SyncCameraFromStore() {
    const cameraState = useAppSelector((state: RootState) => state.camera)
    const {camera} = useThree()

    useEffect(() => {
        if (!camera) return

        const originWorld = camera.matrixWorldAutoUpdate
        const origin = camera.matrixAutoUpdate
        camera.matrixAutoUpdate = false
        camera.matrixWorldAutoUpdate = false

        camera.position.fromArray(cameraState.position)
        camera.quaternion.fromArray(cameraState.quaternion as [number, number, number, number])
        camera.zoom = cameraState.zoom
        camera.updateProjectionMatrix()

        camera.updateMatrix()
        camera.updateMatrixWorld(true)

        camera.matrixAutoUpdate = origin;
        camera.matrixWorldAutoUpdate = originWorld;
    }, [camera, cameraState]);

    return null
}

const Scene = ({path, loader, index, modelCache}: {
    path: string,
    loader: LoaderType,
    index: number,
    modelCache: Map<number, ModelCacheItem>
}) => {
    useFrame(({gl, scene, camera}) => {
        try {
            gl.clear(true, true, true)
            gl.render(scene, camera)
        } catch (e) {
            console.error(e)
        }
    })

    return <>
        <Lights/>
        <SyncCameraFromStore/>

        <Suspense fallback={<Loader/>}>
            <Model index={index} modelPath={path} loader={loader} modelCache={modelCache}/>
        </Suspense>
    </>
}

const CopyCanvas = ({renderCanvas, proxyCanvas, monoCanvas, size: {width, height}, viewportSize}: {
    renderCanvas: HTMLCanvasElement,
    proxyCanvas: HTMLCanvasElement,
    monoCanvas: HTMLCanvasElement,
    size: { width: number, height: number },
    viewportSize: { width: number, height: number }
}) => {
    const {focusedCandidate, gap, renderDirection} = useAppSelector((state: RootState) => state.controls.render);

    useFrame(() => {
        if (!proxyCanvas || !renderCanvas || !monoCanvas) return

        const ctx = proxyCanvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, proxyCanvas.width, proxyCanvas.height)
        ctx.drawImage(renderCanvas, 0, 0, width, height, 0, 0, proxyCanvas.width, proxyCanvas.height);

        const ctxMono = monoCanvas.getContext('2d')
        if (!ctxMono) return

        let sx: number, sy: number
        if (renderDirection === 'horizontal') {
            sx = Math.max(0, focusedCandidate * (viewportSize.width + gap))
            sy = 0
        } else {
            sx = 0
            sy = Math.max(0, focusedCandidate * (viewportSize.height + gap))
        }

        ctxMono.clearRect(0, 0, monoCanvas.width, monoCanvas.height)
        ctxMono.drawImage(renderCanvas, sx, sy, viewportSize.width, viewportSize.height, 0, 0, monoCanvas.width, monoCanvas.height)

        const lineWidth = viewportSize.width / 100
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = "#db4242"
        ctx.strokeRect(sx + lineWidth / 2, sy + lineWidth / 2, viewportSize.width - lineWidth, viewportSize.height - lineWidth)
    })

    return null
}

const ModelRenderer: React.FC = () => {
    const {workDir, selectedCandidates, selectedFile} = useAppSelector((state: RootState) => state.controls.files);
    const {renderDirection, viewportSize, gap, focusedCandidate} = useAppSelector((state: RootState) => state.controls.render);
    const {
        outputDir,
        outputToWorkdir,
        outputFormat,
        outputQuality,
        backgroundTransparent,
        renderScale
    } = useAppSelector((state: RootState) => state.controls.output);
    const containerRef = useRef<HTMLDivElement>(null)

    const [modelPaths, setModelPaths] = useState<string[]>([])

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resultCanvasRef = useRef<HTMLCanvasElement>(null);
    const monoCanvasRef = useRef<HTMLCanvasElement>(null);

    const canvasSize = useMemo(() => ({
        width: renderScale * viewportSize.width * (renderDirection === 'horizontal' ? selectedCandidates.length : 1) + (renderDirection === 'horizontal' ? gap * Math.max(0, selectedCandidates.length - 1) : 0),
        height: renderScale * viewportSize.height * (renderDirection === 'vertical' ? selectedCandidates.length : 1) + (renderDirection === 'vertical' ? gap * Math.max(0, selectedCandidates.length - 1) : 0)
    }), [renderScale, viewportSize.width, viewportSize.height, renderDirection, selectedCandidates.length, gap]);

    const modelCache = useRef<Map<number, ModelCacheItem>>(new Map<number, ModelCacheItem>())

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

    const dispatch = useAppDispatch();

    const validFocusedCandidate = useMemo(() => {
        if (selectedCandidates.length > 0) {
            return Math.max(0, Math.min(selectedCandidates.length - 1, focusedCandidate))
        } else {
            return -1
        }
    }, [focusedCandidate, selectedCandidates.length])

    useEffect(() => {
        const captureListener = (msg: { filename: string }) => {
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
            flexDirection: renderDirection === 'horizontal' ? 'column' : 'row',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: 16,
            gap: 16
        }}>

        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            zIndex: -1,
            opacity: 0
        }}>
            <div
                style={{
                    top: 0, left: 0,
                    width: canvasSize.width,
                    height: canvasSize.height,
                    position: 'fixed',
                    display: 'flex',
                    gap: gap, justifyContent: 'center', alignItems: 'center',
                    flexDirection: renderDirection === 'horizontal' ? 'row' : 'column'
                }}>
                {modelPaths.map((path, index) => (
                    <View index={index + 1} key={index} style={{
                        width: viewportSize.width * renderScale,
                        height: viewportSize.height * renderScale
                    }}>
                        <Scene path={path} loader={loader} index={index} modelCache={modelCache.current}/>
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
                <CopyCanvas
                    renderCanvas={canvasRef.current}
                    proxyCanvas={resultCanvasRef.current}
                    monoCanvas={monoCanvasRef.current}
                    size={canvasSize}
                    viewportSize={{
                        width: viewportSize.width * renderScale,
                        height: viewportSize.height * renderScale
                    }}/>

                <View.Port/>
            </Canvas>
        </div>

        <div>
            <Typography.Text>输出预览</Typography.Text>
            <canvas ref={resultCanvasRef} width={canvasSize.width} height={canvasSize.height} style={{
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                boxSizing: 'border-box',
                boxShadow: "0 0 5px 0 #cccccc"
            }}/>
        </div>

        <div style={{}}>
            <div style={{display: 'flex'}}>
                <Typography.Text style={{flex: 1}}>单视图调整</Typography.Text>
                <Select variant="filled" options={selectedCandidates.map((candidate, index) => ({
                    label: candidate,
                    value: index
                }))} value={validFocusedCandidate} onChange={(value) => {
                    dispatch(setState(state => state.render.focusedCandidate = value))
                }} style={{minWidth: 200}}/>
            </div>
            <canvas ref={monoCanvasRef} width={viewportSize.width * renderScale} height={viewportSize.height * renderScale}
                    style={{
                        flex: 1,
                        boxShadow: "0 0 5px 0 #cccccc"
                    }}
            />
        </div>

    </div>
}

export default ModelRenderer;