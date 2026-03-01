export default {
    name: 'Black Hole',
    label: 'absorbing',
    duration: 10,
    init(model, scene, THREE) {
        this.origScale = model.scale.clone();
        this.origPos = model.position.clone();
        this.origRot = model.rotation.clone();
        var cx = this.origPos.x, cy = this.origPos.y;
        var torusGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 64);
        var torusMat = new THREE.MeshStandardMaterial({
            color: 0x4400aa, emissive: 0x220066, emissiveIntensity: 1.2,
            transparent: true, opacity: 0, roughness: 0.3, metalness: 0.7
        });
        this.vortexRing = new THREE.Mesh(torusGeo, torusMat);
        this.vortexRing.rotation.x = Math.PI * 0.33;
        this.vortexRing.position.set(cx, cy, 0);
        scene.add(this.vortexRing);
        var horizonGeo = new THREE.SphereGeometry(0.3, 24, 24);
        var horizonMat = new THREE.MeshBasicMaterial({ color: 0x110033, transparent: true, opacity: 0 });
        this.horizon = new THREE.Mesh(horizonGeo, horizonMat);
        this.horizon.position.set(cx, cy, 0);
        scene.add(this.horizon);
        this.particles = [];
        var particleGeo = new THREE.SphereGeometry(0.035, 8, 8);
        for (var i = 0; i < 20; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x8844ff : (i % 3 === 1 ? 0x4400aa : 0x6622cc),
                transparent: true, opacity: 0
            });
            var p = new THREE.Mesh(particleGeo, pMat);
            p.userData = { angle: (i / 20) * Math.PI * 2, radius: 1.3 + Math.random() * 0.4,
                speed: 1.5 + Math.random() * 1.5, heightOffset: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2 };
            scene.add(p);
            this.particles.push(p);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var cx = this.origPos.x, cy = this.origPos.y;
        var spinSpeed = time * 2.0;
        if (progress <= 0.4) {
            var p1 = progress / 0.4;
            this.vortexRing.material.opacity = p1 * 0.85;
            this.vortexRing.rotation.z = spinSpeed;
            this.horizon.material.opacity = p1 * 0.6;
            this.horizon.scale.setScalar(0.5 + p1 * 0.5);
            this.particles.forEach(function(p) { p.material.opacity = p1 * 0.9; });
            var stretch = 1.0 + p1 * 0.8, squeeze = 1.0 - p1 * 0.4;
            model.scale.set(this.origScale.x * squeeze, this.origScale.y * stretch, this.origScale.z * squeeze);
            model.position.y = cy - p1 * 0.3;
            model.rotation.y = this.origRot.y + p1 * 0.25;
            model.visible = true;
        } else if (progress <= 0.6) {
            var p2 = (progress - 0.4) / 0.2;
            this.vortexRing.material.opacity = 0.85;
            this.vortexRing.rotation.z = spinSpeed;
            this.vortexRing.material.emissiveIntensity = 1.2 + p2 * 1.0;
            this.horizon.material.opacity = 0.6 + p2 * 0.3;
            this.horizon.scale.setScalar(1.0 + Math.sin(p2 * Math.PI) * 0.2);
            this.particles.forEach(function(p) { p.material.opacity = 0.9; });
            var shrink = 1.0 - p2, stretchY = 1.8 + p2 * 1.2, squeezeXZ = 0.6 * shrink;
            model.scale.set(this.origScale.x * Math.max(squeezeXZ, 0.01),
                this.origScale.y * Math.max(stretchY * shrink, 0.01),
                this.origScale.z * Math.max(squeezeXZ, 0.01));
            model.position.y = cy - 0.3 - p2 * 0.5;
            model.rotation.y = this.origRot.y + 0.25 + p2 * 0.15;
            model.visible = p2 <= 0.95;
        } else {
            var p3 = (progress - 0.6) / 0.4;
            this.vortexRing.material.opacity = 0.85 * (1.0 - p3);
            this.vortexRing.rotation.z = spinSpeed;
            this.vortexRing.material.emissiveIntensity = 2.2 * (1.0 - p3) + 1.2;
            var ringScale = 1.0 - p3 * 0.7;
            this.vortexRing.scale.set(ringScale, ringScale, ringScale);
            this.horizon.material.opacity = 0.9 * (1.0 - p3);
            this.horizon.scale.setScalar((1.0 - p3) * 1.2);
            this.particles.forEach(function(p) { p.material.opacity = 0.9 * (1.0 - p3); });
            if (p3 > 0.2) {
                model.visible = true;
                var emerge = (p3 - 0.2) / 0.8;
                var eased = 1.0 - Math.pow(1.0 - emerge, 3);
                model.scale.set(eased * this.origScale.x + (1.0 - eased) * 0.01,
                    eased * this.origScale.y + (1.0 - eased) * 0.01,
                    eased * this.origScale.z + (1.0 - eased) * 0.01);
                model.position.y = cy - 0.8 * (1.0 - eased);
                model.rotation.y = this.origRot.y + 0.3 * (1.0 - eased);
            } else { model.visible = false; }
        }
        var tilt = Math.PI * 0.33;
        var self = this;
        this.particles.forEach(function(p) {
            var d = p.userData;
            var ca = d.angle + spinSpeed * d.speed * 0.5;
            var px = Math.cos(ca) * d.radius;
            var yFlat = Math.sin(ca) * d.radius;
            p.position.set(cx + px, cy + yFlat * Math.cos(tilt) + d.heightOffset, yFlat * Math.sin(tilt) + d.heightOffset * 0.5);
            p.scale.setScalar(1.0 + Math.sin(time * 4 + d.phase) * 0.3);
        });
    },
    cleanup(model, scene, THREE) {
        if (this.vortexRing) { scene.remove(this.vortexRing); this.vortexRing.geometry.dispose(); this.vortexRing.material.dispose(); this.vortexRing = null; }
        if (this.horizon) { scene.remove(this.horizon); this.horizon.geometry.dispose(); this.horizon.material.dispose(); this.horizon = null; }
        if (this.particles) { this.particles.forEach(function(p) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }); this.particles = []; }
        if (this.origScale) { model.scale.copy(this.origScale); }
        if (this.origPos) { model.position.copy(this.origPos); }
        if (this.origRot) { model.rotation.copy(this.origRot); }
        model.visible = true;
    }
};
