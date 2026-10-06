/**
 * 场景数据类型定义
 *
 * 数据来源：用户本人提供的结构化场景配置（用户自有内容），
 * 已本地化全部资源路径。本文件只描述结构，不含任何第三方品牌或专有代码。
 */

export type Vec3 = [number, number, number];

export type EnvironmentPreset = 'city' | 'sunset' | 'dawn' | 'warehouse' | 'forest' | 'studio';

export interface LightConfig {
  intensity: number;
  color: string;
  angle?: number;
  height?: number;
}

export interface RenderConfig {
  background: string;
  environment: { preset: EnvironmentPreset; intensity: number };
  lights: { ambient: LightConfig; key: LightConfig };
  bloom: { enabled: boolean; intensity: number; threshold: number };
  dof: { enabled: boolean; focusDistance: number; focusRange: number; bokeh: number };
}

/** 贴纸（decal）：贴在模型表面的图形，携带法线用于朝向对齐 */
export interface DecalConfig {
  id: string;
  source: 'upload' | 'preset';
  imageUrl: string;
  /** 模型局部空间坐标 */
  position: Vec3;
  /** 表面法线，用于让贴纸贴合曲面朝向 */
  normal: Vec3;
  /** 绕法线的旋转（弧度） */
  rotation: number;
  /** 平面尺寸 [宽, 高] */
  size: [number, number];
  metalness: number;
  roughness: number;
  opacity: number;
  /** 无障碍名称，用于替代文本 */
  label?: string;
}

export interface LinkConfig {
  icon: 'link' | 'github' | 'mail' | 'phone' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'dribbble';
  url: string;
  /** 纯文本型联系方式（如微信号），非 http 链接 */
  copyOnly?: boolean;
  label?: string;
}

/** 相机 stop：一次镜头聚焦，同时承载该段叙事文案 */
export interface SceneNode {
  id: string;
  order: number;
  camera: { position: Vec3; target: Vec3 };
  render: RenderConfig;
  overlay: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    body?: string;
    logo?: string;
    logoAlt?: string;
    links?: LinkConfig[];
  };
  thumbUrl?: string;
}

export interface PresentationConfig {
  scrollSpeed: number;
  environment: {
    preset: EnvironmentPreset;
    intensity: number;
    rotation: number;
    autoRotate: boolean;
    rotateSpeed: number;
  };
  timelineTemplate: 'classic' | 'counter' | 'blueprint';
  nodeShape: 'circle' | 'square' | 'diamond';
  nodeColor: string;
  lineColor: string;
  textColor: string;
  accentColor: string;
  defaultFont: string;
  pointerParallax: boolean;
  noiseEnabled: boolean;
  noiseColor: string;
  noiseOpacity: number;
}

export interface HeroConfig {
  title: string;
  body: string;
  scrollHint: string;
  cornerTL: string;
  cornerTR: string;
  cornerBL: string;
  cornerRight: string;
  links: LinkConfig[];
  camera: { position: Vec3; target: Vec3 };
  thumbUrl?: string;
  template: 'editorial' | 'classic' | 'minimal';
  frameColor: string;
  render: RenderConfig;
}

export interface LoadingConfig {
  background: string;
  text: string;
  spinnerStyle: 'dots' | 'ring' | 'bar';
  spinnerColor: string;
  template: 'classic' | 'counter' | 'blueprint';
}

export interface PortfolioItem {
  id: string;
  name: string;
  /** 可选外链，点击跳转 */
  url?: string;
  /** 可选配图（本地路径） */
  image?: string;
  description?: string;
}

export interface PortfolioSection {
  id: string;
  title: string;
  items: PortfolioItem[];
}

export interface PortfolioConfig {
  enabled: boolean;
  template: 'gallery-horizontal' | 'grid' | 'list';
  title: string;
  hint: string;
  bgColor: string;
  bgOpacity: number;
  sections: PortfolioSection[];
}

export interface SceneConfig {
  profile: {
    name: string;
    nameEn: string;
    headline: string;
    email: string;
    phone: string;
    wechat: string;
    github: string;
    city: string;
  };
  model: {
    url: string;
    scale: number;
    position: Vec3;
  };
  decals: DecalConfig[];
  nodes: SceneNode[];
  presentation: PresentationConfig;
  hero: HeroConfig;
  loading: LoadingConfig;
  portfolio: PortfolioConfig;
  site: {
    accentColor: string;
    textColor: string;
    backgroundColor: string;
    title: string;
  };
}
