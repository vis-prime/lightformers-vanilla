/**
 * Env/bg/sun options
 * @enum
 */
export const EnvOptions = {
  between_bridges: {
    env: "./between_bridges_1k.hdr",
    bg: "./between_bridges1.webp",
    sunPos: [10, 5, 8],
    sunCol: "#ffffeb",
    shadowOpacity: 0.5,
    groundProj: { radius: 50, height: 5 },
  },
  wide_street_1: {
    env: "./wide_street_01_1k.exr",
    bg: "./wide_street_01.webp",
    isExr: true,
    sunPos: [15, 24, 11],
    sunCol: "#ffffeb",
    shadowOpacity: 0.85,
    groundProj: { radius: 12, height: 2 },
  },
  ulmer_muenster: {
    env: "./ulmer_muenster_1k.exr",
    bg: "./ulmer_muenster.webp",
    isExr: true,
    sunPos: [17, 14, 12],
    sunCol: "#ffffeb",
    shadowOpacity: 0.72,
    groundProj: { radius: 25, height: 2 },
  },
  wide_street_2: {
    env: "./wide_street_02_1k.exr",
    bg: "./wide_street_02.webp",
    isExr: true,
    sunPos: [16, 8, 12],
    sunCol: "#ffffeb",
    shadowOpacity: 0.55,
    groundProj: { radius: 25, height: 2 },
  },
}
