export default {
    name: 'Coalescing',
    label: 'coalescing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Scattered particles that will coalesce
        this._particles = [];
        var colors = [0x8877aa, 0xaa88cc, 0x9966bb, 0xcc99dd, 0x7755aa, 0xddaaee];
        for (var i = 0; i < 35; i++) {
            var size = 0.02 + Math.random() * 0.03;
            var pGeo = new THREE.SphereGeometry(size, 6, 6);
            var pMat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true, opacity: 0, depthWrite: false
            });
            var particle = new THREE.Mesh(pGeo, pMat);
            particle.visible = false;
            scene.add(particle);

            // Random starting positions spread wide
            var angle = Math.random() * Math.PI * 2;
            var dist = 0.8 + Math.random() * 0.7;
            this._particles.push({
                mesh: particle,
                startX: ox + Math.cos(angle) * dist,
                startY: oy + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                baseSize: size,
                cluster: -1,
                merged: false,
                driftPhase: Math.random() * Math.PI * 2,
                driftSpeed: 0.5 + Math.random() * 1.5
            });
        }

        // Cluster merge spheres (intermediate clusters)
        this._clusters = [];
        for (var c = 0; c < 5; c++) {
            var cAngle = (c / 5) * Math.PI * 2;
            var cGeo = new THREE.SphereGeometry(0.06, 8, 8);
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xbb88dd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cluster = new THREE.Mesh(cGeo, cMat);
            cluster.position.set(
                ox + Math.cos(cAngle) * 0.35,
                oy + Math.sin(cAngle) * 0.35,
                0
            );
            cluster.visible = false;
            scene.add(cluster);
            this._clusters.push({
                mesh: cluster,
                targetX: ox + Math.cos(cAngle) * 0.35,
                targetY: oy + Math.sin(cAngle) * 0.35,
                size: 0.06,
                absorbed: 0
            });
        }

        // Final unified mass
        var massGeo = new THREE.SphereGeometry(0.18, 12, 12);
        var massMat = new THREE.MeshBasicMaterial({
            color: 0xddaaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._unifiedMass = new THREE.Mesh(massGeo, massMat);
        this._unifiedMass.position.set(ox, oy, 0);
        scene.add(this._unifiedMass);

        // Accretion glow
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x9966cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._accretionGlow = new THREE.Mesh(glowGeo, glowMat);
        this._accretionGlow.position.set(ox, oy, 0);
        scene.add(this._accretionGlow);

        // Dust trail particles
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var d = 0; d < 20; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0xccaaee, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({
                mesh: dust, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._dustIdx = 0;
    },
    _spawnDust(x, y) {
        var d = this._dust[this._dustIdx % this._dust.length];
        this._dustIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, 0);
        d.vx = (Math.random() - 0.5) * 0.2;
        d.vy = (Math.random() - 0.5) * 0.2;
        d.life = 0.5 + Math.random() * 0.4;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Phase 1: Particles drift independently (0-15%)
        if (progress < 0.15) {
            var t = progress / 0.15;
            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                p.mesh.visible = true;
                p.mesh.material.opacity = t * 0.7;
                // Independent drifting
                var driftX = Math.sin(time * p.driftSpeed + p.driftPhase) * 0.05;
                var driftY = Math.cos(time * p.driftSpeed * 0.7 + p.driftPhase) * 0.05;
                p.mesh.position.set(p.startX + driftX, p.startY + driftY, 0);
            }
        }
        // Phase 2: Gravitational attraction begins (15-35%)
        else if (progress < 0.35) {
            var t2 = (progress - 0.15) / 0.20;
            var pullStrength = t2 * 0.6;
            for (var i2 = 0; i2 < this._particles.length; i2++) {
                var p2 = this._particles[i2];
                // Assign to nearest cluster
                var cIdx = i2 % this._clusters.length;
                var cx = this._clusters[cIdx].targetX;
                var cy = this._clusters[cIdx].targetY;
                // Lerp toward cluster
                var curX = p2.startX + (cx - p2.startX) * pullStrength;
                var curY = p2.startY + (cy - p2.startY) * pullStrength;
                var driftX2 = Math.sin(time * p2.driftSpeed + p2.driftPhase) * 0.03 * (1 - t2);
                var driftY2 = Math.cos(time * p2.driftSpeed * 0.7 + p2.driftPhase) * 0.03 * (1 - t2);
                p2.mesh.position.set(curX + driftX2, curY + driftY2, 0);
                p2.mesh.material.opacity = 0.7;

                // Spawn dust trails
                if (Math.random() < 0.03 * pullStrength) {
                    this._spawnDust(p2.mesh.position.x, p2.mesh.position.y);
                }
            }
        }
        // Phase 3: Particles merge into clusters (35-55%)
        else if (progress < 0.55) {
            var t3 = (progress - 0.35) / 0.20;
            // Particles shrink and merge into cluster spheres
            for (var i3 = 0; i3 < this._particles.length; i3++) {
                var p3 = this._particles[i3];
                var cIdx3 = i3 % this._clusters.length;
                var cx3 = this._clusters[cIdx3].targetX;
                var cy3 = this._clusters[cIdx3].targetY;
                p3.mesh.position.set(
                    cx3 + Math.sin(time * 2 + i3) * 0.02 * (1 - t3),
                    cy3 + Math.cos(time * 2 + i3) * 0.02 * (1 - t3),
                    0
                );
                p3.mesh.material.opacity = 0.7 * (1 - t3);
                p3.mesh.scale.setScalar(1 - t3 * 0.8);
            }
            // Clusters grow
            for (var c = 0; c < this._clusters.length; c++) {
                var cl = this._clusters[c];
                cl.mesh.visible = true;
                cl.mesh.material.opacity = t3 * 0.8;
                cl.mesh.scale.setScalar(1 + t3 * 1.5);
            }
        }
        // Phase 4: Clusters merge toward center (55-75%)
        else if (progress < 0.75) {
            var t4 = (progress - 0.55) / 0.20;
            // Hide individual particles
            for (var i4 = 0; i4 < this._particles.length; i4++) {
                this._particles[i4].mesh.visible = false;
            }
            // Clusters move toward center and shrink
            for (var c2 = 0; c2 < this._clusters.length; c2++) {
                var cl2 = this._clusters[c2];
                var cLerpX = cl2.targetX + (ox - cl2.targetX) * t4;
                var cLerpY = cl2.targetY + (oy - cl2.targetY) * t4;
                cl2.mesh.position.set(cLerpX, cLerpY, 0);
                cl2.mesh.material.opacity = 0.8 * (1 - t4 * 0.7);
                cl2.mesh.scale.setScalar(2.5 * (1 - t4 * 0.6));

                if (Math.random() < 0.06) {
                    this._spawnDust(cLerpX, cLerpY);
                }
            }
            // Unified mass appears
            this._unifiedMass.material.opacity = t4 * 0.6;
            this._unifiedMass.scale.setScalar(0.5 + t4 * 0.8);
            this._accretionGlow.material.opacity = t4 * 0.2;
        }
        // Phase 5: Final unified mass pulses (75-90%)
        else if (progress < 0.90) {
            var t5 = (progress - 0.75) / 0.15;
            // Hide clusters
            for (var c3 = 0; c3 < this._clusters.length; c3++) {
                this._clusters[c3].mesh.visible = false;
            }
            // Unified mass pulses
            var pulse = 1 + Math.sin(time * 4) * 0.15;
            this._unifiedMass.material.opacity = 0.6 + Math.sin(time * 3) * 0.15;
            this._unifiedMass.scale.setScalar(1.3 * pulse);
            this._unifiedMass.position.set(ox, oy, 0);

            // Accretion glow pulses
            this._accretionGlow.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
            this._accretionGlow.scale.setScalar(1.5 + Math.sin(time * 3) * 0.3);

            // Model slightly drawn to mass
            var pullModel = Math.sin(time * 2) * 0.02;
            model.position.set(ox + pullModel, oy, oz);
        }
        // Phase 6: Fade out, restore (90-100%)
        else {
            var t6 = (progress - 0.90) / 0.10;
            this._unifiedMass.material.opacity = 0.6 * (1 - t6);
            this._unifiedMass.scale.setScalar(1.3 + t6 * 0.5);
            this._accretionGlow.material.opacity = 0.3 * (1 - t6);
            this._accretionGlow.scale.setScalar(1.8 + t6 * 0.5);

            model.position.set(
                ox + 0.02 * (1 - t6),
                oy,
                oz
            );
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update dust particles
        for (var di = 0; di < this._dust.length; di++) {
            var dd = this._dust[di];
            if (dd.life <= 0) continue;
            dd.life -= delta;
            if (dd.life <= 0) { dd.mesh.visible = false; continue; }
            dd.mesh.position.x += dd.vx * delta;
            dd.mesh.position.y += dd.vy * delta;
            dd.mesh.material.opacity = 0.5 * (dd.life / dd.maxLife);
            dd.mesh.scale.setScalar(0.8 + (1 - dd.life / dd.maxLife) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._clusters) { this._clusters.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._unifiedMass) { scene.remove(this._unifiedMass); this._unifiedMass.geometry.dispose(); this._unifiedMass.material.dispose(); }
        if (this._accretionGlow) { scene.remove(this._accretionGlow); this._accretionGlow.geometry.dispose(); this._accretionGlow.material.dispose(); }
        if (this._dust) { this._dust.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        this._particles = this._clusters = this._unifiedMass = this._accretionGlow = this._dust = null;
    }
};