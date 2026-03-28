# Asset Annotation Engineering Notes

This folder contains the engineering skeleton for turning FULI images into usable annotated design assets.

## Files
- `types.ts`: core asset annotation and role types
- `mockAnnotatedAssets.ts`: temporary seed examples
- `annotationStrategy.ts`: placeholder inherited annotation flow
- `generated/productAssetIndex.json`: generated registry from `public/products`
- `productAssetIndex.ts`: typed access to real product assets
- `realAnnotatedAssets.ts`: bridge layer from real products to future annotated assets

## Intended next steps
1. Attach real annotations onto `realAnnotatedAssets`
2. Add embedding-based nearest-neighbor selection
3. Add cluster prior support
4. Surface nearest annotated references in simulator / sandbox
5. Connect asset priors into generation spec assembly
