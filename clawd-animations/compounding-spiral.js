export default {
    name: 'Compounding Spiral',
    label: 'compounding',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Spiral trail particles
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var i = 0; i < 60; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x44aaff : (i % 3 === 1 ? 0xffaa44 : 0x44ffaa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dot = new THREE.Mesh(trailGeo, tMat);
            dot.visible = false;
            scene.add(dot);
            this._trail.push({ mesh: dot, active: false, age: 0 });
        }
        this._trailIdx = 0;
        this._lastTrail = 0;

        // Growth glow around model
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        scene.add(this._glow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var spiralProgress = 0;

        if (progress < 0.1) {
            // Wind up
            var t = progress / 0.1;
            model.scale.setScalar(this._origScale.x * (1 - t * 0.1));
        } else if (progress < 0.8) {
            // Spiral upward
            spiralProgress = (progress - 0.1) / 0.7;
            var angle = spiralProgress * Math.PI * 6; // 3 full loops
            var radius = 0.3 + spiralProgress * 0.4;
            var height = spiralProgress * 2.0;
            var spiralX = orig.x + Math.cos(angle) * radius - radius;
            var spiralY = orig.y + height;

            model.position.set(spiralX, spiralY, Math.sin(angle) * radius * 0.3);
            model.rotation.z = Math.sin(angle) * 0.1;

            // Grow slightly with each loop
            var growFactor = 1 + spiralProgress * 0.3;
            model.scale.setScalar(this._origScale.x * growFactor);

            // Glow intensifies
            this._glow.position.copy(model.position);
            this._glow.material.opacity = spiralProgress * 0.15;
            this._glow.scale.setScalar(growFactor * 1.5);

            // Leave trail
            if (time - this._lastTrail > 0.04) {
                var ti = this._trailIdx % this._trail.length;
                var tr = this._trail[ti];
                tr.mesh.visible = true;
                tr.mesh.position.copy(model.position);
                tr.mesh.material.opacity = 0.6;
                tr.mesh.scale.setScalar(0.5 + spiralProgress * 0.5);
                tr.active = true;
                tr.age = 0;
                this._trailIdx++;
                this._lastTrail = time;
            }
        } else {
            // Descend back
            var t2 = (progress - 0.8) / 0.2;
            var ease = t2 * t2;
            var lastAngle = Math.PI * 6;
            var lastRadius = 0.7;
            var peakX = orig.x + Math.cos(lastAngle) * lastRadius - lastRadius;
            var peakY = orig.y + 2.0;
            model.position.set(
                peakX + (orig.x - peakX) * ease,
                peakY + (orig.y - peakY) * ease,
                0
            );
            model.scale.setScalar(this._origScale.x * (1.3 - ease * 0.3));
            model.rotation.z = 0;
            this._glow.material.opacity = 0.15 * (1 - ease);
            this._glow.position.copy(model.position);
        }

        // Fade trail particles
        for (var j = 0; j < this._trail.length; j++) {
            var tp = this._trail[j];
            if (!tp.active) continue;
            tp.age += delta;
            var fade = Math.max(0, 1 - tp.age / 1.5);
            tp.mesh.material.opacity = 0.5 * fade;
            if (fade <= 0) { tp.mesh.visible = false; tp.active = false; }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._trail) { this._trail.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._trail = this._glow = null;
    }
};
