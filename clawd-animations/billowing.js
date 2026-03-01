export default {
    name: 'Billowing',
    label: 'billowing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Billow particles - large puffy spheres of varied sizes
        this._particles = [];
        for (var i = 0; i < 30; i++) {
            var size = 0.05 + Math.random() * 0.15;
            var pGeo = new THREE.SphereGeometry(size, 8, 8);
            // Gray -> white -> light blue gradient based on index
            var colorVal = i < 10 ? 0x889999 : (i < 20 ? 0xbbcccc : 0xaabbdd);
            var pMat = new THREE.MeshBasicMaterial({
                color: colorVal, transparent: true, opacity: 0,
                depthWrite: false
            });
            var particle = new THREE.Mesh(pGeo, pMat);
            particle.visible = false;
            scene.add(particle);
            this._particles.push({
                mesh: particle, life: 0, maxLife: 0,
                active: false, wave: Math.floor(i / 10),
                angle: 0, radius: 0, vy: 0,
                swirlSpeed: 1 + Math.random() * 2,
                swirlPhase: Math.random() * Math.PI * 2,
                baseSize: size,
                emitted: false
            });
        }
        this._emitIdx = 0;

        // Inner glow when model is obscured
        var glowGeo = new THREE.SphereGeometry(0.5, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x99aacc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._innerGlow = new THREE.Mesh(glowGeo, glowMat);
        this._innerGlow.position.copy(this._origPos);
        scene.add(this._innerGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;
        var obscure = 0;

        // Phase: First wisp emerges (0-8%)
        if (progress < 0.08) {
            intensity = progress / 0.08;
            this._emitWave(0, intensity, time, orig);
        }
        // Phase: Billow expands outward (8-30%)
        else if (progress < 0.30) {
            intensity = 0.3 + 0.5 * ((progress - 0.08) / 0.22);
            this._emitWave(0, 1.0, time, orig);
            if (progress > 0.15) this._emitWave(1, (progress - 0.15) / 0.15, time, orig);
        }
        // Phase: Full billow obscures model (30-55%)
        else if (progress < 0.55) {
            intensity = 1.0;
            obscure = Math.min((progress - 0.30) / 0.1, 1.0);
            this._emitWave(0, 1.0, time, orig);
            this._emitWave(1, 1.0, time, orig);
            this._emitWave(2, (progress - 0.30) / 0.25, time, orig);
        }
        // Phase: Swirling internal turbulence (55-75%)
        else if (progress < 0.75) {
            intensity = 1.0;
            obscure = 1.0 - (progress - 0.55) / 0.20 * 0.3;
            this._emitWave(0, 1.0, time, orig);
            this._emitWave(1, 1.0, time, orig);
            this._emitWave(2, 1.0, time, orig);
        }
        // Phase: Billow dissipates outward (75-90%)
        else if (progress < 0.90) {
            var dissipate = (progress - 0.75) / 0.15;
            intensity = 1.0 - dissipate * 0.8;
            obscure = 0.7 * (1 - dissipate);
        }
        // Phase: Clear (90-100%)
        else {
            var clearRate = (progress - 0.90) / 0.10;
            intensity = 0.2 * (1 - clearRate);
            obscure = 0;
        }

        // Update all particles
        for (var i = 0; i < this._particles.length; i++) {
            var p = this._particles[i];
            if (!p.active) continue;

            // Swirling turbulence motion
            var swirlAngle = time * p.swirlSpeed + p.swirlPhase;
            var expandFactor = 0;

            // Wave 0: close to model
            if (p.wave === 0) {
                expandFactor = intensity * 0.6;
            }
            // Wave 1: middle ring
            else if (p.wave === 1) {
                expandFactor = intensity * 1.0;
            }
            // Wave 2: outer ring
            else {
                expandFactor = intensity * 1.5;
            }

            // Circular swirl with expansion
            var baseAngle = p.angle + Math.sin(swirlAngle) * 0.5;
            var baseRadius = p.radius * expandFactor;

            // During turbulence phase (55-75%), increase swirl
            var turbulence = 0;
            if (progress >= 0.55 && progress < 0.75) {
                turbulence = Math.sin(time * 3 + p.swirlPhase) * 0.15;
            }

            // During dissipation phase (75-90%), push outward
            var dissipateRadius = 0;
            if (progress >= 0.75 && progress < 0.90) {
                dissipateRadius = ((progress - 0.75) / 0.15) * 1.5;
            }

            p.mesh.position.set(
                orig.x + Math.cos(baseAngle) * (baseRadius + dissipateRadius) + turbulence,
                orig.y + Math.sin(baseAngle) * (baseRadius * 0.6 + dissipateRadius * 0.5) + p.vy + turbulence * 0.5,
                (Math.sin(swirlAngle * 0.5) * 0.1)
            );

            // Opacity based on phase
            var targetOp = 0;
            if (progress < 0.90) {
                targetOp = intensity * 0.4;
            } else {
                targetOp = intensity * 0.4 * (1 - (progress - 0.90) / 0.10);
            }
            p.mesh.material.opacity = targetOp;

            // Scale pulsation
            var pulseFactor = 1 + Math.sin(time * 2 + p.swirlPhase) * 0.2;
            p.mesh.scale.setScalar(pulseFactor * (1 + dissipateRadius * 0.3));
        }

        // Inner glow
        this._innerGlow.position.copy(orig);
        this._innerGlow.material.opacity = obscure * 0.15;
        this._innerGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);

        // Model visibility - obscured during peak billow
        if (obscure > 0.5) {
            model.visible = Math.sin(time * 8) > 0; // flickering visibility
        } else {
            model.visible = true;
        }

        // Gentle model drift in the smoke
        var drift = Math.sin(time * 1.2) * 0.03 * intensity;
        model.position.set(orig.x + drift, orig.y, orig.z);

        // Settle
        if (progress >= 0.90) {
            model.visible = true;
            var settle = (progress - 0.90) / 0.10;
            model.position.set(
                orig.x + drift * (1 - settle),
                orig.y,
                orig.z
            );
            if (settle > 0.8) {
                model.position.copy(orig);
            }
        }
    },
    _emitWave: function(waveNum, waveIntensity, time, orig) {
        for (var i = waveNum * 10; i < (waveNum + 1) * 10 && i < this._particles.length; i++) {
            var p = this._particles[i];
            if (p.emitted) continue;
            p.emitted = true;
            p.active = true;
            p.mesh.visible = true;
            // Distribute in a ring pattern
            var idx = i - waveNum * 10;
            p.angle = (idx / 10) * Math.PI * 2;
            p.radius = 0.2 + waveNum * 0.3 + Math.random() * 0.15;
            p.vy = (Math.random() - 0.3) * 0.2;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        this._particles = this._innerGlow = null;
    }
};
