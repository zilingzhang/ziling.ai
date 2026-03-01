export default {
    name: 'Levitating',
    label: 'levitating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // 3 concentric torus rings below model
        this._rings = [];
        var ringColors = [0x8844cc, 0x6644ff, 0x44aacc];
        var ringSizes = [0.35, 0.55, 0.75];
        var ringGeo1 = new THREE.TorusGeometry(ringSizes[0], 0.015, 8, 32);
        var ringGeo2 = new THREE.TorusGeometry(ringSizes[1], 0.018, 8, 32);
        var ringGeo3 = new THREE.TorusGeometry(ringSizes[2], 0.012, 8, 32);
        var ringGeos = [ringGeo1, ringGeo2, ringGeo3];

        for (var i = 0; i < 3; i++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: ringColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeos[i], rMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(this._origPos.x, this._origPos.y - 0.3, 0);
            ring.visible = false;
            scene.add(ring);
            this._rings.push({
                mesh: ring,
                size: ringSizes[i],
                rotSpeed: (i + 1) * 0.7,
                pulsePhase: i * Math.PI * 0.6
            });
        }

        // Downward jet particles (cyan/white)
        this._jets = [];
        var jetGeo = new THREE.SphereGeometry(0.018, 6, 6);
        for (var j = 0; j < 20; j++) {
            var jMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0x44ffff : (j % 3 === 1 ? 0xffffff : 0x88ccff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var jm = new THREE.Mesh(jetGeo, jMat);
            jm.visible = false;
            scene.add(jm);
            this._jets.push({
                mesh: jm,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 0.3,
                vy: 0,
                vz: (Math.random() - 0.5) * 0.2,
                active: false,
                spawnAngle: (j / 20) * Math.PI * 2
            });
        }
        this._jetIdx = 0;

        // Energy field sphere below model
        var fieldGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var fieldMat = new THREE.MeshBasicMaterial({
            color: 0x6644cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._field = new THREE.Mesh(fieldGeo, fieldMat);
        this._field.position.set(this._origPos.x, this._origPos.y - 0.3, 0);
        this._field.visible = false;
        scene.add(this._field);

        // Upper aura glow
        var auraGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x88aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.copy(this._origPos);
        scene.add(this._aura);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var liftAmount = 0;
        var ringIntensity = 0;

        if (progress < 0.10) {
            // Phase 1: First ring appears
            var p = progress / 0.10;
            ringIntensity = p * 0.3;
            this._rings[0].mesh.visible = true;
            this._rings[0].mesh.material.opacity = p * 0.6;

            model.position.set(orig.x, orig.y, orig.z);

        } else if (progress < 0.30) {
            // Phase 2: Rings pulse, model starts rising
            var p2 = (progress - 0.10) / 0.20;
            ringIntensity = 0.3 + p2 * 0.7;
            liftAmount = p2 * 0.5;

            // Second ring appears
            if (p2 > 0.3) {
                this._rings[1].mesh.visible = true;
                this._rings[1].mesh.material.opacity = (p2 - 0.3) / 0.7 * 0.5;
            }
            // Third ring appears
            if (p2 > 0.6) {
                this._rings[2].mesh.visible = true;
                this._rings[2].mesh.material.opacity = (p2 - 0.6) / 0.4 * 0.4;
            }

            model.position.set(orig.x, orig.y + liftAmount, orig.z);
            this._field.visible = true;

        } else if (progress < 0.60) {
            // Phase 3: Full levitation, all rings active
            var p3 = (progress - 0.30) / 0.30;
            ringIntensity = 1;
            liftAmount = 0.5 + p3 * 0.3;

            for (var r = 0; r < 3; r++) {
                this._rings[r].mesh.visible = true;
            }

            // Gentle hover bob
            var bob = Math.sin(time * 2) * 0.04;
            model.position.set(orig.x + Math.sin(time * 0.7) * 0.02, orig.y + liftAmount + bob, orig.z);

        } else if (progress < 0.78) {
            // Phase 4: Apex hover with bob, downward particle jets
            var p4 = (progress - 0.60) / 0.18;
            ringIntensity = 1;
            liftAmount = 0.8;

            // Gentle hover bob
            var bob2 = Math.sin(time * 2.5) * 0.06;
            var drift = Math.sin(time * 0.8) * 0.03;
            model.position.set(orig.x + drift, orig.y + liftAmount + bob2, orig.z);

            // Spawn jet particles downward
            if (delta > 0 && this._jetIdx < 1000) {
                var ji = this._jetIdx % this._jets.length;
                var jp = this._jets[ji];
                var spawnRadius = 0.2 + Math.random() * 0.3;
                var spawnAngle = Math.random() * Math.PI * 2;
                jp.mesh.visible = true;
                jp.mesh.position.set(
                    model.position.x + Math.cos(spawnAngle) * spawnRadius,
                    model.position.y - 0.2,
                    Math.sin(spawnAngle) * spawnRadius * 0.5
                );
                jp.life = jp.maxLife;
                jp.vy = -(1.0 + Math.random() * 0.8);
                jp.vx = (Math.random() - 0.5) * 0.4;
                jp.active = true;
                this._jetIdx++;
            }

        } else if (progress < 0.92) {
            // Phase 5: Rings fade, model descends
            var p5 = (progress - 0.78) / 0.14;
            ringIntensity = 1 - p5;
            liftAmount = 0.8 * (1 - p5 * p5);

            model.position.set(orig.x, orig.y + liftAmount, orig.z);

            // Rings fade
            for (var rf = 0; rf < 3; rf++) {
                this._rings[rf].mesh.material.opacity *= (1 - p5);
            }

        } else {
            // Phase 6: Land
            var p6 = (progress - 0.92) / 0.08;
            ringIntensity = 0;
            model.position.set(orig.x, orig.y + 0.02 * (1 - p6), orig.z);
            model.scale.copy(this._origScale);

            // Hide everything
            for (var rh = 0; rh < 3; rh++) {
                this._rings[rh].mesh.material.opacity = 0;
            }
            this._field.visible = false;
            this._aura.material.opacity = 0;
        }

        // Update ring rotations and pulse
        for (var ri = 0; ri < this._rings.length; ri++) {
            var ring = this._rings[ri];
            if (ring.mesh.visible) {
                ring.mesh.rotation.z = time * ring.rotSpeed;
                // Pulse scale
                var pulse = 1 + Math.sin(time * 3 + ring.pulsePhase) * 0.08 * ringIntensity;
                ring.mesh.scale.set(pulse, pulse, 1);
                // Rings follow model vertically, stay below
                ring.mesh.position.set(model.position.x, model.position.y - 0.25 - ri * 0.08, 0);
            }
        }

        // Update energy field
        if (this._field.visible) {
            this._field.position.set(model.position.x, model.position.y - 0.3, 0);
            this._field.material.opacity = ringIntensity * 0.1 + Math.sin(time * 4) * 0.02;
            this._field.scale.setScalar(1 + ringIntensity * 0.5 + Math.sin(time * 2.5) * 0.1);
        }

        // Update aura
        this._aura.position.set(model.position.x, model.position.y, -0.1);
        this._aura.material.opacity = ringIntensity * 0.08;
        this._aura.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);

        // Slight model tilt during hover
        model.rotation.z = Math.sin(time * 0.9) * 0.03 * ringIntensity;

        // Update jet particles
        for (var jj = 0; jj < this._jets.length; jj++) {
            var jet = this._jets[jj];
            if (jet.active && jet.life > 0) {
                jet.life -= delta;
                jet.mesh.position.x += jet.vx * delta;
                jet.mesh.position.y += jet.vy * delta;
                jet.mesh.position.z += jet.vz * delta;
                var lifeRatio = Math.max(0, jet.life / jet.maxLife);
                jet.mesh.material.opacity = lifeRatio * 0.5;
                jet.mesh.scale.setScalar(0.4 + (1 - lifeRatio) * 0.6);
                if (jet.life <= 0) {
                    jet.active = false;
                    jet.mesh.visible = false;
                }
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rings) {
            this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._jets) {
            this._jets.forEach(function(j) { scene.remove(j.mesh); j.mesh.geometry.dispose(); j.mesh.material.dispose(); });
        }
        if (this._field) { scene.remove(this._field); this._field.geometry.dispose(); this._field.material.dispose(); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._rings = this._jets = this._field = this._aura = null;
    }
};
