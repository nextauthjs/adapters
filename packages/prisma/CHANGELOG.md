# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.4.4...@next-auth/prisma-adapter@0.5.0) (2021-06-26)

### Bug Fixes

- **prisma:** email provider ([4aad0a7](https://github.com/nextauthjs/adapters/commit/4aad0a7b8c9195de61ddb5d49743290d8ce15266))
- **prisma:** populate `userCache` within `getUser` ([40ce161](https://github.com/nextauthjs/adapters/commit/40ce16170768db04dffd2d472850a42201bcfc31))
- **prisma:** populate createSession's sessionCache ([4322183](https://github.com/nextauthjs/adapters/commit/43221837cf0b21f5a2706b73d2b8dd3ffda863ad))
- **prisma:** reset migrations before builds ([d9af674](https://github.com/nextauthjs/adapters/commit/d9af674796ca4b351f18f86fab238f83ba553c02))
- **prisma:** types ([1ebb017](https://github.com/nextauthjs/adapters/commit/1ebb0177ebb110aea542c2d0130757cb965b01c3))
- **prisma:** user retrieval ([9f67af5](https://github.com/nextauthjs/adapters/commit/9f67af51c13ea320817ef2be33771612120b281d))
- vuln ([5f46f00](https://github.com/nextauthjs/adapters/commit/5f46f0007bfdb4534f737bdb155b9d48fb08d7a8))

### Features

- **prisma:** add prisma-legacy adapter ([#63](https://github.com/nextauthjs/adapters/issues/63)) ([a70f4ee](https://github.com/nextauthjs/adapters/commit/a70f4ee0523a05e8db9671060d4eebc5b571522f))
- **prisma:** hand over error-handling to core ([#75](https://github.com/nextauthjs/adapters/issues/75)) ([7f16de7](https://github.com/nextauthjs/adapters/commit/7f16de7f1eb27c0026f9084e9d0ff0e9e9ff8e30))
- **prisma:** pass all profile parameters when creating prisma user ([#132](https://github.com/nextauthjs/adapters/issues/132)) ([0d39d43](https://github.com/nextauthjs/adapters/commit/0d39d43d774b0e0e4f81477185baa7b08e022ff5))
- **prisma:** use new Adapter interface ([#72](https://github.com/nextauthjs/adapters/issues/72)) ([e7a7690](https://github.com/nextauthjs/adapters/commit/e7a7690ca9e0b7e9af9d7456c908837c39a23611))
- add fauna adapter ([#5](https://github.com/nextauthjs/adapters/issues/5)) ([4ef0619](https://github.com/nextauthjs/adapters/commit/4ef0619126dd20dc59f35ac8d9ac38cb2af5ab5a)), closes [#31](https://github.com/nextauthjs/adapters/issues/31)

## [0.4.4](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.4.3...@next-auth/prisma-adapter@0.4.4) (2021-02-08)

### Bug Fixes

- vulnerability ([#31](https://github.com/nextauthjs/adapters/issues/31)) ([eab9ad8](https://github.com/nextauthjs/adapters/commit/eab9ad8f800aa9d974ef1b291851eaf91c1e3a32))

## [0.4.3](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.4.2...@next-auth/prisma-adapter@0.4.3) (2021-02-04)

### Bug Fixes

- **prisma:** getUserByProviderAccountId ([#29](https://github.com/nextauthjs/adapters/issues/29)) ([cc9273c](https://github.com/nextauthjs/adapters/commit/cc9273c29c2c2145b60a0b1b26dc620e71df2182))

## [0.4.2](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.4.1...@next-auth/prisma-adapter@0.4.2) (2021-02-04)

### Bug Fixes

- **prisma:** remove reject not found ([780e481](https://github.com/nextauthjs/adapters/commit/780e481a466449efc1e407babbc7a925e0a8b27e))
- **prisma:** revert uuid ([eb81f72](https://github.com/nextauthjs/adapters/commit/eb81f72aa9730b2575200fd7604177b660a4b44d))

## [0.4.1](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.4.0...@next-auth/prisma-adapter@0.4.1) (2021-02-04)

### Bug Fixes

- **prisma:** ensure providerAccountId is string ([#24](https://github.com/nextauthjs/adapters/issues/24)) ([f0fc749](https://github.com/nextauthjs/adapters/commit/f0fc7499f678c964be5f67f5ee46096941d4371e))

# [0.4.0](https://github.com/nextauthjs/adapters/compare/@next-auth/prisma-adapter@0.3.0...@next-auth/prisma-adapter@0.4.0) (2021-02-04)

### Bug Fixes

- build packages before publish ([#21](https://github.com/nextauthjs/adapters/issues/21)) ([3b6db4c](https://github.com/nextauthjs/adapters/commit/3b6db4cdeb031f5c7a8e637172e048d7de2e036c))

### Features

- **prisma:** switch to uuid ([#20](https://github.com/nextauthjs/adapters/issues/20)) ([3efb47a](https://github.com/nextauthjs/adapters/commit/3efb47a710abc85e5f7267c5e9d9f083b6675a55))

# 0.3.0 (2021-01-29)

### Bug Fixes

- build ([663cac9](https://github.com/nextauthjs/adapters/commit/663cac98e47312692195bc5c176c6944219c96a4))
- **prisma:** add peer dep ([64c186e](https://github.com/nextauthjs/adapters/commit/64c186e48a6d865fe7df42e2cd75b143dba821a9))
- **prisma:** remove reject ([f962569](https://github.com/nextauthjs/adapters/commit/f9625697632f505553e041338df31afcf64a8a82))

### Features

- setup ci/cd ([#6](https://github.com/nextauthjs/adapters/issues/6)) ([39f07f5](https://github.com/nextauthjs/adapters/commit/39f07f546d4c664e470ada0c9a863be6548bda4c))
- add lerna ([80d2c49](https://github.com/nextauthjs/adapters/commit/80d2c495a2def1b40763a7ab2ac17000bf61f3a8))
- **example:** add example adapter ([3746468](https://github.com/nextauthjs/adapters/commit/3746468720894e81e5269bd09053362ce87df984))
- **prisma:** convert to ts ([dc6c33f](https://github.com/nextauthjs/adapters/commit/dc6c33f40c92d0148323339495189a9f32f5d588))

# 0.2.0 (2021-01-29)

### Bug Fixes

- build ([663cac9](https://github.com/nextauthjs/adapters/commit/663cac98e47312692195bc5c176c6944219c96a4))
- **prisma:** add peer dep ([64c186e](https://github.com/nextauthjs/adapters/commit/64c186e48a6d865fe7df42e2cd75b143dba821a9))
- **prisma:** remove reject ([f962569](https://github.com/nextauthjs/adapters/commit/f9625697632f505553e041338df31afcf64a8a82))

### Features

- setup ci/cd ([#6](https://github.com/nextauthjs/adapters/issues/6)) ([39f07f5](https://github.com/nextauthjs/adapters/commit/39f07f546d4c664e470ada0c9a863be6548bda4c))
- add lerna ([80d2c49](https://github.com/nextauthjs/adapters/commit/80d2c495a2def1b40763a7ab2ac17000bf61f3a8))
- **example:** add example adapter ([3746468](https://github.com/nextauthjs/adapters/commit/3746468720894e81e5269bd09053362ce87df984))
- **prisma:** convert to ts ([dc6c33f](https://github.com/nextauthjs/adapters/commit/dc6c33f40c92d0148323339495189a9f32f5d588))

# 0.1.0 (2021-01-29)

### Bug Fixes

- build ([663cac9](https://github.com/nextauthjs/adapters/commit/663cac98e47312692195bc5c176c6944219c96a4))
- **prisma:** add peer dep ([64c186e](https://github.com/nextauthjs/adapters/commit/64c186e48a6d865fe7df42e2cd75b143dba821a9))
- **prisma:** remove reject ([f962569](https://github.com/nextauthjs/adapters/commit/f9625697632f505553e041338df31afcf64a8a82))

### Features

- setup ci/cd ([#6](https://github.com/nextauthjs/adapters/issues/6)) ([39f07f5](https://github.com/nextauthjs/adapters/commit/39f07f546d4c664e470ada0c9a863be6548bda4c))
- add lerna ([80d2c49](https://github.com/nextauthjs/adapters/commit/80d2c495a2def1b40763a7ab2ac17000bf61f3a8))
- **example:** add example adapter ([3746468](https://github.com/nextauthjs/adapters/commit/3746468720894e81e5269bd09053362ce87df984))
- **prisma:** convert to ts ([dc6c33f](https://github.com/nextauthjs/adapters/commit/dc6c33f40c92d0148323339495189a9f32f5d588))
