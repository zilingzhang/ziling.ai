/* Clone helpers for model-based animations */

export function cloneWithMaterials(source) {
    var c = source.clone();
    c.traverse(function (child) {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
        }
    });
    return c;
}

export function setCloneOpacity(clone, opacity) {
    clone.traverse(function (child) {
        if (child.isMesh && child.material) {
            child.material.opacity = opacity;
        }
    });
}

export function setCloneEmissive(clone, color, intensity) {
    clone.traverse(function (child) {
        if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissive.set(color);
            child.material.emissiveIntensity = intensity;
        }
    });
}

export function disposeClone(clone) {
    clone.traverse(function (child) {
        if (child.isMesh && child.material) {
            child.material.dispose();
        }
    });
}
