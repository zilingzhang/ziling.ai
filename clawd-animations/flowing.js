export default {
    name: 'Flowing',
    label: 'flowing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // River stream particles
        this._streamParticles = [];
        var streamGeo = new THREE.SphereGeometry(0.018, 5, 5);
        var colors = [0x3388cc, 0x4499dd, 0x55aaee, 0x2277bb, 0x66bbff];
        for (var i = 0; i < 50; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true, opacity: 0, depthWrite: false
            });
            var sp = new THREE.Mesh(streamGeo, sMat);
            sp.visible = false;
            scene.add(sp);

            // Distribute across stream width
            var lane = (i % 5) * 0.08 - 0.16;
            this._streamParticles.push({
                mesh: sp,
                lane: lane,
                x: -1.2 + (i / 50) * 2.4,
                baseSpeed: 0.4 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                wobble: Math.random() * 0.02
            });
        }

        // Eddy particles (swirl behind model)
        this._eddies = [];
        var eddyGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var e = 0; e < 15; e++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: 0x88ccee, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var eddy = new THREE.Mesh(eddyGeo, eMat);
            eddy.visible = false;
            scene.add(eddy);
            this._eddies.push({
                mesh: eddy,
                angle: (e / 15) * Math.PI * 2,
                radius: 0.05 + Math.random() * 0.08,
                speed: 2 + Math.random() * 2,
                active: false
            });
        }

        // Ripple rings around model
        this._ripples = [];
        for (var r = 0; r < 4; r++) {
            var rGeo = new THREE.RingGeometry(0.08 + r * 0.04, 0.09 + r * 0.04, 16);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xaaddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var ripple = new THREE.Mesh(rGeo, rMat);
            ripple.position.set(ox, oy - 0.1, 0);
            scene.add(ripple);
            this._ripples.push({ mesh: ripple, phase: r * 0.5 });
        }

        // River bank lines (top and bottom)
        var bankGeo = new THREE.BoxGeometry(2.5, 0.02, 0.1);
        var bankMat1 = new THREE.MeshBasicMaterial({
            color: 0x668844, transparent: true, opacity: 0
        });
        var bankMat2 = new THREE.MeshBasicMaterial({
            color: 0x668844, transparent: true, opacity: 0
        });
        this._bankTop = new THREE.Mesh(bankGeo, bankMat1);
        this._bankBot = new THREE.Mesh(bankGeo, bankMat2);
        this._bankTop.position.set(ox, oy - 0.05, -0.03);
        this._bankBot.position.set(ox, oy - 0.45, -0.03);
        scene.add(this._bankTop);
        scene.add(this._bankBot);

        // Zen glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x66aadd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._zenGlow = new THREE.Mesh(glowGeo, glowMat);
        this._zenGlow.position.set(ox, oy, 0);
        scene.add(this._zenGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var streamY = oy - 0.25;

        var intensity = 0;
        var flowSpeed = 0;

        // Phase 1: River appears (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            intensity = t;
            flowSpeed = t * 0.5;
            this._bankTop.material.opacity = t * 0.4;
            this._bankBot.material.opacity = t * 0.4;
        }
        // Phase 2: Flow strengthens (10-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.10) / 0.20;
            intensity = 0.5 + t2 * 0.3;
            flowSpeed = 0.5 + t2 * 0.5;
            this._bankTop.material.opacity = 0.4;
            this._bankBot.material.opacity = 0.4;
        }
        // Phase 3: Full laminar flow, eddies form (30-65%)
        else if (progress < 0.65) {
            intensity = 1.0;
            flowSpeed = 1.0;
        }
        // Phase 4: Zen energy, peaceful flow (65-85%)
        else if (progress < 0.85) {
            var t4 = (progress - 0.65) / 0.20;
            intensity = 1.0;
            flowSpeed = 1.0 - t4 * 0.2;
            this._zenGlow.material.opacity = t4 * 0.15 * (1 + Math.sin(time * 2) * 0.3);
            this._zenGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);
        }
        // Phase 5: Fade out (85-100%)
        else {
            var t5 = (progress - 0.85) / 0.15;
            intensity = 1.0 - t5;
            flowSpeed = 0.8 * (1 - t5);
            this._bankTop.material.opacity = 0.4 * (1 - t5);
            this._bankBot.material.opacity = 0.4 * (1 - t5);
            this._zenGlow.material.opacity = 0.15 * (1 - t5);

            model.position.set(ox, oy, oz);
            if (t5 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update stream particles - continuous flow left to right
        for (var i = 0; i < this._streamParticles.length; i++) {
            var sp = this._streamParticles[i];
            if (intensity <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.visible = true;

            // Move right continuously
            sp.x += sp.baseSpeed * flowSpeed * delta;
            // Wrap around
            if (sp.x > 1.3) sp.x = -1.3;

            var particleX = ox + sp.x;
            var particleY = streamY + sp.lane;

            // Divert around model position
            var dx = particleX - ox;
            var dy = particleY - oy;
            var distToModel = Math.sqrt(dx * dx + dy * dy);
            if (distToModel < 0.2 && intensity > 0.3) {
                // Push particle away from model center
                var pushAngle = Math.atan2(dy, dx);
                var pushStrength = (0.2 - distToModel) * 2;
                particleY += Math.sin(pushAngle) * pushStrength * 0.3;
            }

            // Add wobble
            particleY += Math.sin(time * 2 + sp.phase) * sp.wobble;

            sp.mesh.position.set(particleX, particleY, 0);
            sp.mesh.material.opacity = intensity * 0.5;
            sp.mesh.scale.setScalar(0.8 + Math.sin(time + sp.phase) * 0.2);
        }

        // Update eddies behind model
        if (intensity > 0.3) {
            for (var e = 0; e < this._eddies.length; e++) {
                var ed = this._eddies[e];
                ed.mesh.visible = true;
                ed.angle += ed.speed * delta;
                var eddyX = ox + 0.2 + Math.cos(ed.angle) * ed.radius;
                var eddyY = oy + Math.sin(ed.angle) * ed.radius * 0.5;
                ed.mesh.position.set(eddyX, eddyY, 0);
                ed.mesh.material.opacity = intensity * 0.3 * (0.5 + Math.sin(ed.angle) * 0.5);
            }
        } else {
            for (var e2 = 0; e2 < this._eddies.length; e2++) {
                this._eddies[e2].mesh.visible = false;
            }
        }

        // Update ripple rings
        for (var r = 0; r < this._ripples.length; r++) {
            var rp = this._ripples[r];
            var rippleT = (time * 0.8 + rp.phase) % 2;
            var rippleScale = 1 + rippleT * 0.5;
            var rippleOp = Math.max(0, (1 - rippleT / 2)) * intensity * 0.2;
            rp.mesh.scale.setScalar(rippleScale);
            rp.mesh.material.opacity = rippleOp;
            rp.mesh.position.set(ox + rippleT * 0.05, oy, 0);
        }

        // Model stands in current
        if (progress < 0.85) {
            var currentSway = Math.sin(time * 1.5) * 0.015 * intensity;
            model.position.set(ox + currentSway, oy, oz);
            model.rotation.z = currentSway * 0.5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._streamParticles) { this._streamParticles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._eddies) { this._eddies.forEach(function(e) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); }); }
        if (this._ripples) { this._ripples.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._bankTop) { scene.remove(this._bankTop); this._bankTop.geometry.dispose(); this._bankTop.material.dispose(); }
        if (this._bankBot) { scene.remove(this._bankBot); this._bankBot.geometry.dispose(); this._bankBot.material.dispose(); }
        if (this._zenGlow) { scene.remove(this._zenGlow); this._zenGlow.geometry.dispose(); this._zenGlow.material.dispose(); }
        this._streamParticles = this._eddies = this._ripples = this._bankTop = this._bankBot = this._zenGlow = null;
    }
};