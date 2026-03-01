export default {
    name: 'Portal Drop',
    label: 'portaling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var px = this._origPos.x; // portals at model's x
        var orangeGeo = new THREE.TorusGeometry(0.6, 0.05, 16, 48);
        var orangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
        this._orangeRing = new THREE.Mesh(orangeGeo, orangeMat);
        this._orangeRing.rotation.x = Math.PI / 2;
        this._orangeRing.position.set(px, 1.5, 0);
        this._orangeRing.scale.set(0, 0, 0);
        scene.add(this._orangeRing);
        var orangeGlowGeo = new THREE.TorusGeometry(0.7, 0.1, 16, 48);
        var orangeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
        this._orangeGlow = new THREE.Mesh(orangeGlowGeo, orangeGlowMat);
        this._orangeGlow.rotation.x = Math.PI / 2;
        this._orangeGlow.position.set(px, 1.5, 0);
        this._orangeGlow.scale.set(0, 0, 0);
        scene.add(this._orangeGlow);
        var blueGeo = new THREE.TorusGeometry(0.6, 0.05, 16, 48);
        var blueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
        this._blueRing = new THREE.Mesh(blueGeo, blueMat);
        this._blueRing.rotation.x = Math.PI / 2;
        this._blueRing.position.set(px, -2.0, 0);
        this._blueRing.scale.set(0, 0, 0);
        scene.add(this._blueRing);
        var blueGlowGeo = new THREE.TorusGeometry(0.7, 0.1, 16, 48);
        var blueGlowMat = new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
        this._blueGlow = new THREE.Mesh(blueGlowGeo, blueGlowMat);
        this._blueGlow.rotation.x = Math.PI / 2;
        this._blueGlow.position.set(px, -2.0, 0);
        this._blueGlow.scale.set(0, 0, 0);
        scene.add(this._blueGlow);
        this._portalTopY = 1.5;
        this._portalBottomY = -2.0;
        this._fallRange = this._portalTopY - this._portalBottomY;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var topY = this._portalTopY, bottomY = this._portalBottomY, fallRange = this._fallRange;
        var portalOpacity = 0, portalScale = 0;
        if (progress < 0.15) {
            var fi = progress / 0.15, eo = 1.0 - Math.pow(1.0 - fi, 3.0);
            portalScale = eo; portalOpacity = eo;
        } else if (progress < 0.85) { portalScale = 1.0; portalOpacity = 1.0; }
        else { var fo = 1.0 - (progress - 0.85) / 0.15; var ei = fo * fo; portalScale = ei; portalOpacity = ei; }
        var pulse = 1.0 + Math.sin(time * 3.0) * 0.06;
        var glowPulse = 1.0 + Math.sin(time * 2.5 + 0.5) * 0.08;
        var rs = portalScale * pulse, gs = portalScale * glowPulse;
        this._orangeRing.scale.set(rs, rs, rs); this._orangeRing.material.opacity = portalOpacity * 0.9;
        this._orangeGlow.scale.set(gs, gs, gs); this._orangeGlow.material.opacity = portalOpacity * 0.2;
        this._blueRing.scale.set(rs, rs, rs); this._blueRing.material.opacity = portalOpacity * 0.9;
        this._blueGlow.scale.set(gs, gs, gs); this._blueGlow.material.opacity = portalOpacity * 0.2;
        if (progress < 0.15) {
            var wobble = Math.sin((progress / 0.15) * Math.PI) * 0.05;
            model.position.set(orig.x, orig.y + wobble, orig.z);
        } else if (progress < 0.85) {
            var fp = (progress - 0.15) / 0.70, numLoops = 2.5;
            var cycleFrac = (fp * numLoops) - Math.floor(fp * numLoops);
            var easedFrac = cycleFrac * cycleFrac * 0.4 + cycleFrac * 0.6;
            model.position.set(orig.x, topY - easedFrac * fallRange, orig.z);
            model.rotation.z = Math.sin(cycleFrac * Math.PI * 2) * 0.08;
        } else {
            var st = (progress - 0.85) / 0.15, es = 1.0 - Math.pow(1.0 - st, 3.0);
            var lastCF = 0.5, lastEF = lastCF * lastCF * 0.4 + lastCF * 0.6;
            var lastY = topY - lastEF * fallRange;
            model.position.set(orig.x, lastY + (orig.y - lastY) * es, orig.z);
            model.rotation.z *= (1.0 - es);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos); model.scale.copy(this._origScale); model.rotation.z = 0;
        [this._orangeRing, this._orangeGlow, this._blueRing, this._blueGlow].forEach(function(m) {
            if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
        });
        this._orangeRing = this._orangeGlow = this._blueRing = this._blueGlow = null;
    }
};
