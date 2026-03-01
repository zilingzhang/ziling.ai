export default {
    name: 'Glitch',
    label: 'glitching',
    duration: 10,
    init(model, scene, THREE) {
        this.originalPos = model.position.clone();
        this.originalScale = model.scale.clone();
        var boxGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
        var edgesGeo = new THREE.EdgesGeometry(boxGeo);
        this.cyanGhost = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }));
        this.cyanGhost.position.copy(this.originalPos); this.cyanGhost.position.y += 0.5;
        scene.add(this.cyanGhost);
        this.magentaGhost = new THREE.LineSegments(edgesGeo.clone(), new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0 }));
        this.magentaGhost.position.copy(this.originalPos); this.magentaGhost.position.y += 0.5;
        scene.add(this.magentaGhost);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this.originalPos, os = this.originalScale;
        function srand(seed) { var x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
        var qt = Math.floor(time * 15), gi = 0;
        if (progress < 0.1) gi = (progress / 0.1) * 0.05;
        else if (progress < 0.9) gi = (time % 1.5) < 0.3 ? 1.0 : 0.03;
        else gi = (1.0 - (progress - 0.9) / 0.1) * 0.03;
        var r1 = srand(qt), r2 = srand(qt + 1), r3 = srand(qt + 2), r4 = srand(qt + 3), r5 = srand(qt + 4), r6 = srand(qt + 5), r7 = srand(qt + 6);
        if (gi >= 1.0) {
            model.position.set(orig.x + (r1 - 0.5) * 0.6, orig.y + (r2 - 0.5) * 0.06, orig.z);
            model.visible = r3 > 0.25;
            if (r4 > 0.5) model.scale.set(os.x * (1 + (r5 - 0.5) * 0.4), os.y, os.z);
            else model.scale.set(os.x, os.y * (1 + (r5 - 0.5) * 0.4), os.z);
            this.cyanGhost.material.opacity = 0.5 + r6 * 0.3;
            this.cyanGhost.position.set(orig.x + (r1 - 0.5) * 0.5 + 0.1, orig.y + 0.5 + (r2 - 0.5) * 0.1, orig.z + (r6 - 0.5) * 0.2);
            this.magentaGhost.material.opacity = 0.5 + r7 * 0.3;
            this.magentaGhost.position.set(orig.x + (r3 - 0.5) * 0.5 - 0.1, orig.y + 0.5 + (r4 - 0.5) * 0.1, orig.z + (r7 - 0.5) * 0.2);
        } else if (gi > 0) {
            model.position.set(orig.x + (r1 - 0.5) * gi * 2, orig.y + (r2 - 0.5) * gi * 0.5, orig.z);
            model.visible = true; model.scale.set(os.x, os.y, os.z);
            this.cyanGhost.material.opacity = gi * 0.3;
            this.cyanGhost.position.set(orig.x + (r3 - 0.5) * gi * 1.5, orig.y + 0.5, orig.z);
            this.magentaGhost.material.opacity = gi * 0.3;
            this.magentaGhost.position.set(orig.x + (r4 - 0.5) * gi * 1.5, orig.y + 0.5, orig.z);
        } else {
            model.position.copy(orig); model.visible = true; model.scale.set(os.x, os.y, os.z);
            this.cyanGhost.material.opacity = 0; this.magentaGhost.material.opacity = 0;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this.originalPos); model.scale.copy(this.originalScale); model.visible = true;
        if (this.cyanGhost) { scene.remove(this.cyanGhost); this.cyanGhost.geometry.dispose(); this.cyanGhost.material.dispose(); this.cyanGhost = null; }
        if (this.magentaGhost) { scene.remove(this.magentaGhost); this.magentaGhost.geometry.dispose(); this.magentaGhost.material.dispose(); this.magentaGhost = null; }
    }
};
