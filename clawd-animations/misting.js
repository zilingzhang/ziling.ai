export default {
    name: 'Misting',
    label: 'misting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Fine mist droplets (many small particles)
        this._mistParticles = [];
        var mistGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var i = 0; i < 60; i++) {
            var shade = Math.random();
            var color = shade < 0.33 ? 0xcccccc : (shade < 0.66 ? 0xdddddd : 0xbbbbcc);
            var mMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0,
                depthWrite: false
            });
            var mist = new THREE.Mesh(mistGeo, mMat);
            mist.visible = false;
            scene.add(mist);
            this._mistParticles.push({
                mesh: mist,
                x: ox + (Math.random() - 0.5) * 1.6,
                y: oy + (Math.random() - 0.5) * 1.0,
                driftX: (Math.random() - 0.5) * 0.1,
                driftY: (Math.random() - 0.5) * 0.05,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.5,
                baseSize: 0.5 + Math.random() * 1.0
            });
        }

        // Halo glow around model (light diffusion effect)
        var haloGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var haloMat = new THREE.MeshBasicMaterial({
            color: 0xeeeeff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._halo = new THREE.Mesh(haloGeo, haloMat);
        this._halo.position.set(ox, oy, 0);
        scene.add(this._halo);

        // Dense fog layers (larger, more diffuse)
        this._fogLayers = [];
        var fogGeo = new THREE.SphereGeometry(0.15, 8, 8);
        for (var f = 0; f < 8; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xddddee, transparent: true, opacity: 0,
                depthWrite: false
            });
            var fog = new THREE.Mesh(fogGeo, fMat);
            fog.position.set(
                ox + (Math.random() - 0.5) * 1.0,
                oy + (Math.random() - 0.5) * 0.6,
                -0.05
            );
            fog.scale.setScalar(1 + Math.random() * 1.5);
            scene.add(fog);
            this._fogLayers.push({
                mesh: fog,
                baseX: fog.position.x,
                baseY: fog.position.y,
                driftSpeed: 0.1 + Math.random() * 0.15,
                phase: Math.random() * Math.PI * 2
            });
        }

        this._visibility = 1.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        var mistDensity = 0;
        var haloStrength = 0;

        // Phase 1: First wisps appear (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            mistDensity = t * 0.2;
        }
        // Phase 2: Mist thickens (10-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.10) / 0.20;
            mistDensity = 0.2 + t2 * 0.4;
        }
        // Phase 3: Dense mist, model partially obscured (30-55%)
        else if (progress < 0.55) {
            var t3 = (progress - 0.30) / 0.25;
            mistDensity = 0.6 + t3 * 0.35;
            haloStrength = t3 * 0.8;
        }
        // Phase 4: Peak density, ethereal atmosphere (55-70%)
        else if (progress < 0.70) {
            mistDensity = 0.95;
            haloStrength = 0.8 + Math.sin(time * 1.5) * 0.1;
        }
        // Phase 5: Mist slowly lifts (70-88%)
        else if (progress < 0.88) {
            var t5 = (progress - 0.70) / 0.18;
            mistDensity = 0.95 * (1 - t5);
            haloStrength = 0.8 * (1 - t5);
        }
        // Phase 6: Clear (88-100%)
        else {
            var t6 = (progress - 0.88) / 0.12;
            mistDensity = 0.05 * (1 - t6);
            haloStrength = 0;

            model.position.set(ox, oy, oz);
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update mist particles
        var numVisible = Math.floor(mistDensity * this._mistParticles.length);
        for (var i = 0; i < this._mistParticles.length; i++) {
            var mp = this._mistParticles[i];
            if (i < numVisible) {
                mp.mesh.visible = true;
                // Gentle drift
                var driftX = Math.sin(time * mp.speed + mp.phase) * 0.1;
                var driftY = Math.cos(time * mp.speed * 0.7 + mp.phase) * 0.05;
                mp.mesh.position.set(
                    mp.x + driftX + mp.driftX * Math.sin(time * 0.5),
                    mp.y + driftY + mp.driftY * Math.cos(time * 0.3),
                    (Math.sin(time * 0.4 + mp.phase) * 0.03)
                );
                // Opacity based on density, with some variation
                var particleOp = mistDensity * 0.35 * (0.5 + Math.sin(time * 0.8 + mp.phase) * 0.5);
                mp.mesh.material.opacity = particleOp;
                mp.mesh.scale.setScalar(mp.baseSize * (0.8 + Math.sin(time * 0.5 + mp.phase) * 0.2));
            } else {
                mp.mesh.visible = false;
            }
        }

        // Update fog layers
        for (var f = 0; f < this._fogLayers.length; f++) {
            var fl = this._fogLayers[f];
            fl.mesh.position.x = fl.baseX + Math.sin(time * fl.driftSpeed + fl.phase) * 0.15;
            fl.mesh.position.y = fl.baseY + Math.cos(time * fl.driftSpeed * 0.8 + fl.phase) * 0.08;
            fl.mesh.material.opacity = mistDensity * 0.12;

            // During lifting phase, fog layers rise
            if (progress > 0.70 && progress < 0.88) {
                var liftT = (progress - 0.70) / 0.18;
                fl.mesh.position.y += liftT * 0.3;
            }
        }

        // Halo effect around model
        this._halo.position.set(ox, oy, 0);
        this._halo.material.opacity = haloStrength * 0.12;
        this._halo.scale.setScalar(1 + haloStrength * 0.3 + Math.sin(time * 2) * 0.05);

        // Model partially obscured at peak mist
        if (mistDensity > 0.7) {
            // Subtle visibility modulation
            var obscure = (mistDensity - 0.7) / 0.3;
            model.visible = true; // keep visible but could modulate scale
            model.scale.copy(this._origScale).multiplyScalar(1 - obscure * 0.02);
        } else {
            model.scale.copy(this._origScale);
        }

        // Gentle model sway in mist
        if (progress < 0.88) {
            var mistSway = Math.sin(time * 0.6) * 0.008 * mistDensity;
            model.position.set(ox + mistSway, oy, oz);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._mistParticles) { this._mistParticles.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._halo) { scene.remove(this._halo); this._halo.geometry.dispose(); this._halo.material.dispose(); }
        if (this._fogLayers) { this._fogLayers.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        this._mistParticles = this._halo = this._fogLayers = null;
    }
};