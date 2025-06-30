import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface AnimatedBlobProps {
  isVoiceConnected?: boolean;
  isVoiceLoading?: boolean;
  onToggleVoice?: () => void;
  className?: string;
  style?: React.CSSProperties;
  startCallButtonText?: string;
  endCallButtonText?: string;
  connectingText?: string;
}

const AnimatedBlob: React.FC<AnimatedBlobProps> = ({
  isVoiceConnected = false,
  isVoiceLoading = false,
  onToggleVoice,
  className = '',
  style = {},
  startCallButtonText = 'Start a call',
  endCallButtonText = 'End call',
  connectingText = 'Connecting...'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const meshRef = useRef<THREE.Mesh>();
  const animationIdRef = useRef<number>();
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Waveform state
  const [waveformData, setWaveformData] = useState<number[]>(Array(32).fill(0));
  const waveformRef = useRef<number[]>(Array(32).fill(0));

  // Generate animated waveform data
  useEffect(() => {
    let animationId: number;
    
    const updateWaveform = () => {
      const time = Date.now() * 0.001;
      const newWaveform = Array(32).fill(0).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        let amplitude = 0.1;
        
        if (isVoiceConnected) {
          // Active voice - more dynamic waveform
          amplitude = 0.3 + Math.sin(time * 3 + angle * 2) * 0.2 + 
                     Math.sin(time * 5 + angle * 3) * 0.1 +
                     Math.sin(time * 7 + angle) * 0.05;
        } else if (isVoiceLoading) {
          // Loading state - pulsing waveform
          amplitude = 0.2 + Math.sin(time * 4) * 0.1;
        } else {
          // Idle state - subtle breathing effect
          amplitude = 0.1 + Math.sin(time * 1.5) * 0.05;
        }
        
        return Math.max(0, amplitude);
      });
      
      waveformRef.current = newWaveform;
      setWaveformData([...newWaveform]);
      
      animationId = requestAnimationFrame(updateWaveform);
    };
    
    updateWaveform();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isVoiceConnected, isVoiceLoading]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Create blob geometry
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    
    // Create material with shader for animated effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: isVoiceConnected ? 1.0 : 0.3 },
        voiceActivity: { value: isVoiceLoading ? 1.0 : 0.0 },
        mousePosition: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        uniform float time;
        uniform float intensity;
        uniform float voiceActivity;
        uniform vec2 mousePosition;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Noise function
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 =   v - i + dot(i, C.xxx) ;
          
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }
        
        void main() {
          vNormal = normal;
          vPosition = position;
          
          vec3 pos = position;
          
          // Base noise displacement
          float noise1 = snoise(pos * 2.0 + time * 0.5) * 0.1;
          float noise2 = snoise(pos * 4.0 + time * 0.3) * 0.05;
          float noise3 = snoise(pos * 8.0 + time * 0.8) * 0.025;
          
          // Voice activity effect
          float voiceEffect = voiceActivity * sin(time * 10.0) * 0.1;
          
          // Mouse interaction effect
          float mouseEffect = length(mousePosition) * 0.05;
          
          // Combine all effects
          float totalDisplacement = (noise1 + noise2 + noise3 + voiceEffect + mouseEffect) * intensity;
          
          pos += normal * totalDisplacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform float voiceActivity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          
          // Base gradient
          vec3 baseColor = mix(
            vec3(0.2, 0.4, 0.8),  // Blue
            vec3(0.6, 0.3, 0.9),  // Purple
            (vPosition.y + 1.0) * 0.5
          );
          
          // Voice activity color shift
          vec3 voiceColor = mix(baseColor, vec3(0.9, 0.4, 0.2), voiceActivity);
          
          // Fresnel effect
          float fresnel = pow(1.0 - dot(normal, vec3(0.0, 0.0, 1.0)), 2.0);
          
          // Final color with intensity
          vec3 finalColor = mix(voiceColor * 0.3, voiceColor, intensity);
          finalColor += fresnel * 0.3;
          
          // Subtle animation
          finalColor *= 0.9 + 0.1 * sin(time * 2.0);
          
          gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    mountRef.current.appendChild(renderer.domElement);

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !meshRef.current) return;

      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value += 0.01;
      material.uniforms.intensity.value = THREE.MathUtils.lerp(
        material.uniforms.intensity.value,
        isVoiceConnected ? 1.0 : 0.3,
        0.05
      );
      material.uniforms.voiceActivity.value = THREE.MathUtils.lerp(
        material.uniforms.voiceActivity.value,
        isVoiceLoading ? 1.0 : 0.0,
        0.1
      );

      // Gentle rotation
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(material.uniforms.time.value * 0.5) * 0.1;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isVoiceConnected, isVoiceLoading]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse interaction
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!mountRef.current || !meshRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.mousePosition.value.set(x * 0.5, y * 0.5);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsInteracting(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInteracting(false);
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.mousePosition.value.set(0, 0);
    }
  }, []);

  // Circular waveform component
  const CircularWaveform = () => {
    const radius = 180;
    const centerX = 200;
    const centerY = 200;
    const barWidth = 3;
    const maxBarHeight = 40;
    
    return (
      <svg
        width="400"
        height="400"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {waveformData.map((amplitude, index) => {
          const angle = (index / waveformData.length) * 2 * Math.PI - Math.PI / 2;
          const barHeight = amplitude * maxBarHeight;
          
          // Inner position (closer to center)
          const innerX = centerX + Math.cos(angle) * (radius - barHeight / 2);
          const innerY = centerY + Math.sin(angle) * (radius - barHeight / 2);
          
          // Outer position (further from center)
          const outerX = centerX + Math.cos(angle) * (radius + barHeight / 2);
          const outerY = centerY + Math.sin(angle) * (radius + barHeight / 2);
          
          return (
            <line
              key={index}
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke={
                isVoiceConnected 
                  ? `rgba(239, 68, 68, ${0.6 + amplitude * 0.4})` 
                  : isVoiceLoading
                    ? `rgba(251, 191, 36, ${0.4 + amplitude * 0.4})`
                    : `rgba(255, 255, 255, ${0.3 + amplitude * 0.3})`
              }
              strokeWidth={barWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div 
      className={`animated-blob-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: onToggleVoice ? 'pointer' : 'default',
        ...style
      }}
    >
      <div
        ref={mountRef}
        className="blob-canvas"
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Circular Waveform */}
      <CircularWaveform />
      
      {/* Overlay content */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px', // Increased spacing between button and text
          pointerEvents: 'none'
        }}
      >

        <span 
              style={{
                marginRight: '8px', // Increased margin
                width: '40px', // Increased size
                height: '40px', // Increased size
                backgroundColor: isVoiceConnected ? '#ef4444' : '#1f2937',
                borderRadius: '50%',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // Added shadow to icon circle
              }}
            >
              {isVoiceLoading ? (
                <div 
                  style={{
                    width: '20px', // Increased spinner size
                    height: '20px',
                    border: '3px solid rgba(255, 255, 255, 0.3)', // Thicker spinner
                    borderTop: '3px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
              ) : (
                <svg 
                  width="20" // Increased icon size
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" // Thicker stroke
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  {isVoiceConnected ? (
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  ) : (
                    <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
                  )}
                </svg>
              )}
            </span>

        {/* Enhanced start call button */}
        {onToggleVoice && (
          <button
            onClick={onToggleVoice}
            disabled={isVoiceLoading}
            style={{
              pointerEvents: 'auto',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              fontSize: '16px', // Increased font size
              fontWeight: '600', // Bolder font
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '2px solid rgba(255, 255, 255, 0.3)', // Thicker border
              borderRadius: '50px',
              width: '180px', // Increased width
              padding: '12px 8px', // Increased padding
              height: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque
              backdropFilter: 'blur(20px)', // Stronger blur
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)', // Enhanced shadow
              cursor: isVoiceLoading ? 'not-allowed' : 'pointer',
              opacity: isVoiceLoading ? 0.7 : 1,
              transform: isInteracting ? 'scale(1.05)' : 'scale(1)', // Hover scale effect
            }}
          >

            <span style={{ 
              paddingRight: '12px', // Increased padding
              color: '#1f2937', // Darker text
              fontWeight: '600', // Bolder text
              letterSpacing: '0.5px' // Added letter spacing for elegance
            }}>
              {isVoiceLoading ? connectingText : isVoiceConnected ? endCallButtonText : startCallButtonText}
            </span>
          </button>
        )}
      </div>

      {/* Add spinning animation keyframes */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AnimatedBlob; 