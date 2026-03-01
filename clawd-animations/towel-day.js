export default {
    name: 'Towel Day',
    label: 'floating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Star particles
        this._stars = [];
        var starGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var i = 0; i < 40; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 4 === 0 ? 0xffffff : (i % 4 === 1 ? 0xaaccff : (i % 4 === 2 ? 0xffddaa : 0xccddff)),
                transparent: true, opacity: 0
            });
            var star = new THREE.Mesh(starGeo, sMat);
            star.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 3,
                -0.5 - Math.random() * 1
            );
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                twinkleSpeed: 2 + Math.random() * 4,
                twinklePhase: Math.random() * Math.PI * 2,
                baseOp: 0.3 + Math.random() * 0.5
            });
        }

        // Gentle glow behind model
        var glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(glowGeo, glowMat);
        this._aura.position.copy(this._origPos);
        scene.add(this._aura);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var floatIntensity = 0;

        if (progress < 0.15) {
            floatIntensity = progress / 0.15;
        } else if (progress < 0.85) {
            floatIntensity = 1;
        } else {
            floatIntensity = 1 - (progress - 0.85) / 0.15;
        }

        // Float upward gently with slow sinusoidal drift
        var floatY = Math.sin(time * 0.8) * 0.15 + floatIntensity * 0.4;
        var driftX = Math.sin(time * 0.5) * 0.1;
        model.position.set(orig.x + driftX * floatIntensity, orig.y + floatY, orig.z);
        model.rotation.z = Math.sin(time * 0.6) * 0.05 * floatIntensity;

        // Aura follows and pulses
        this._aura.position.set(model.position.x, model.position.y, -0.1);
        this._aura.material.opacity = floatIntensity * (0.08 + Math.sin(time * 1.5) * 0.03);
        this._aura.scale.setScalar(1 + Math.sin(time * 1.2) * 0.1);

        // Stars twinkle
        for (var i = 0; i < this._stars.length; i++) {
            var s = this._stars[i];
            s.mesh.visible = floatIntensity > 0.1;
            var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.5 + 0.5;
            s.mesh.material.opacity = s.baseOp * twinkle * floatIntensity;
            s.mesh.scale.setScalar(0.5 + twinkle * 0.8);
        }

        // Return to rest
        if (progress >= 0.85) {
            var settle = (progress - 0.85) / 0.15;
            model.position.set(
                orig.x + driftX * (1 - settle),
                orig.y + floatY * (1 - settle),
                orig.z
            );
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._stars) { this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._stars = this._aura = null;
    }
};
