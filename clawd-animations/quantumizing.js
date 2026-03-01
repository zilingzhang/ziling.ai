export default {
    name: 'Quantumizing',
    label: 'quantumizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Ghost positions (superposition states)
        this._ghostPositions = [
            { x: this._origPos.x - 0.5, y: this._origPos.y + 0.3 },
            { x: this._origPos.x + 0.5, y: this._origPos.y + 0.3 },
            { x: this._origPos.x - 0.3, y: this._origPos.y - 0.4 },
            { x: this._origPos.x + 0.3, y: this._origPos.y - 0.4 }
        ];

        // Ghost sphere particles at each position (15 per ghost = 60 total)
        this._ghosts = [];
        var ghostGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var g = 0; g < 4; g++) {
            var ghostGroup = [];
            for (var p = 0; p < 15; p++) {
                var gMat = new THREE.MeshBasicMaterial({
                    color: g === 0 ? 0x8866ff : (g === 1 ? 0x6688ff : (g === 2 ? 0xaa66ff : 0x66aaff)),
                    transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var gm = new THREE.Mesh(ghostGeo, gMat);
                gm.visible = false;
                scene.add(gm);
                ghostGroup.push({
                    mesh: gm,
                    offsetX: (Math.random() - 0.5) * 0.2,
                    offsetY: (Math.random() - 0.5) * 0.25,
                    flickerSpeed: 3 + Math.random() * 5,
                    flickerPhase: Math.random() * Math.PI * 2
                });
            }
            this._ghosts.push(ghostGroup);
        }

        // Probability cloud (large translucent sphere)
        var cloudGeo = new THREE.SphereGeometry(0.6, 16, 16);
        var cloudMat = new THREE.MeshBasicMaterial({
            color: 0x7744cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._cloud = new THREE.Mesh(cloudGeo, cloudMat);
        this._cloud.position.copy(this._origPos);
        scene.add(this._cloud);

        // Measurement particles (converging toward chosen position)
        this._measureParticles = [];
        var measGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var m = 0; m < 20; m++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: m % 2 === 0 ? 0xffffff : 0xaaddff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mm = new THREE.Mesh(measGeo, mMat);
            mm.visible = false;
            scene.add(mm);
            this._measureParticles.push({
                mesh: mm,
                startAngle: (m / 20) * Math.PI * 2,
                startRadius: 1.2 + Math.random() * 0.5,
                speed: 0.8 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Collapse flash
        var flashGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._collapseFlash = new THREE.Mesh(flashGeo, flashMat);
        this._collapseFlash.position.copy(this._origPos);
        this._collapseFlash.visible = false;
        scene.add(this._collapseFlash);

        // Collapse poof particles
        this._poofParticles = [];
        var poofGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var pf = 0; pf < 12; pf++) {
            var pfMat = new THREE.MeshBasicMaterial({
                color: pf % 3 === 0 ? 0xbb88ff : (pf % 3 === 1 ? 0x8888ff : 0xaa66ff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pfm = new THREE.Mesh(poofGeo, pfMat);
            pfm.visible = false;
            scene.add(pfm);
            this._poofParticles.push({
                mesh: pfm,
                vx: 0, vy: 0,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.3,
                active: false
            });
        }

        // Which ghost position "wins" (chosen at init)
        this._chosenGhost = 0; // Always collapse to first position, then return
        this._poofTriggered = false;
        this._flickerTimer = 0;
        this._currentGhostIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var oz = orig.z;
        this._flickerTimer += delta;

        if (progress < 0.08) {
            // Phase 1: Model starts flickering
            var p = progress / 0.08;
            var flicker = Math.sin(time * 15) > 0 ? 1 : 0.3;
            model.visible = true;
            model.position.copy(orig);
            model.scale.set(
                this._origScale.x * (0.9 + flicker * 0.1),
                this._origScale.y * (0.9 + flicker * 0.1),
                this._origScale.z
            );

            // Cloud begins
            this._cloud.material.opacity = p * 0.03;

        } else if (progress < 0.25) {
            // Phase 2: Ghost copies split out
            var p2 = (progress - 0.08) / 0.17;

            // Model jumps between positions rapidly to simulate superposition
            var jumpSpeed = 6 + p2 * 10;
            this._currentGhostIdx = Math.floor(time * jumpSpeed) % 4;
            var gPos = this._ghostPositions[this._currentGhostIdx];

            // Interpolate model toward ghost position
            var blend = p2 * 0.7;
            model.position.set(
                orig.x + (gPos.x - orig.x) * blend,
                orig.y + (gPos.y - orig.y) * blend,
                oz
            );
            model.visible = true;

            // Ghost particles appear at all positions
            for (var g = 0; g < 4; g++) {
                var ghostGroup = this._ghosts[g];
                var ghostPos = this._ghostPositions[g];
                var ghostFade = Math.min(1, p2 / 0.5);
                for (var gp = 0; gp < ghostGroup.length; gp++) {
                    var ghost = ghostGroup[gp];
                    ghost.mesh.visible = true;
                    ghost.mesh.position.set(
                        ghostPos.x + ghost.offsetX,
                        ghostPos.y + ghost.offsetY,
                        0
                    );
                    var flicker2 = Math.sin(time * ghost.flickerSpeed + ghost.flickerPhase);
                    ghost.mesh.material.opacity = ghostFade * 0.25 * (0.5 + flicker2 * 0.5);
                    ghost.mesh.scale.setScalar(0.5 + Math.abs(flicker2) * 0.5);
                }
            }

            this._cloud.material.opacity = 0.03 + p2 * 0.05;
            this._cloud.scale.setScalar(1 + p2 * 0.3);

        } else if (progress < 0.50) {
            // Phase 3: All copies exist simultaneously, flickering
            var p3 = (progress - 0.25) / 0.25;

            // Model rapidly teleports between ghost positions
            var jumpSpeed2 = 16;
            this._currentGhostIdx = Math.floor(time * jumpSpeed2) % 4;
            var gPos2 = this._ghostPositions[this._currentGhostIdx];
            model.position.set(gPos2.x, gPos2.y, oz);
            model.visible = Math.sin(time * 20) > -0.3;

            // All ghost particle groups active and flickering
            for (var g2 = 0; g2 < 4; g2++) {
                var ghostGroup2 = this._ghosts[g2];
                var ghostPos2 = this._ghostPositions[g2];
                for (var gp2 = 0; gp2 < ghostGroup2.length; gp2++) {
                    var ghost2 = ghostGroup2[gp2];
                    var flicker3 = Math.sin(time * ghost2.flickerSpeed + ghost2.flickerPhase);
                    ghost2.mesh.material.opacity = 0.3 * (0.5 + flicker3 * 0.5);
                    ghost2.mesh.position.set(
                        ghostPos2.x + ghost2.offsetX + Math.sin(time * 3 + gp2) * 0.01,
                        ghostPos2.y + ghost2.offsetY + Math.cos(time * 2.5 + gp2) * 0.01,
                        0
                    );
                }
            }

            this._cloud.material.opacity = 0.08 + Math.sin(time * 3) * 0.02;
            this._cloud.scale.setScalar(1.3 + Math.sin(time * 2) * 0.1);

        } else if (progress < 0.65) {
            // Phase 4: Measurement particles approach
            var p4 = (progress - 0.50) / 0.15;

            // Model still teleporting but slowing down
            var jumpSpeed3 = 16 * (1 - p4 * 0.5);
            this._currentGhostIdx = Math.floor(time * jumpSpeed3) % 4;
            var gPos3 = this._ghostPositions[this._currentGhostIdx];
            model.position.set(gPos3.x, gPos3.y, oz);
            model.visible = true;

            // Ghosts still active
            for (var g3 = 0; g3 < 4; g3++) {
                var ghostGroup3 = this._ghosts[g3];
                var ghostPos3 = this._ghostPositions[g3];
                for (var gp3 = 0; gp3 < ghostGroup3.length; gp3++) {
                    var ghost3 = ghostGroup3[gp3];
                    ghost3.mesh.material.opacity = 0.3 * (0.5 + Math.sin(time * ghost3.flickerSpeed + ghost3.flickerPhase) * 0.5);
                }
            }

            // Measurement particles converge toward chosen ghost
            var chosenPos = this._ghostPositions[this._chosenGhost];
            for (var mp = 0; mp < this._measureParticles.length; mp++) {
                var meas = this._measureParticles[mp];
                meas.mesh.visible = true;
                var convergeFactor = 1 - p4;
                var mAngle = meas.startAngle + time * 0.5;
                var mRadius = meas.startRadius * convergeFactor;
                meas.mesh.position.set(
                    chosenPos.x + Math.cos(mAngle) * mRadius,
                    chosenPos.y + Math.sin(mAngle) * mRadius,
                    0
                );
                meas.mesh.material.opacity = p4 * 0.6;
                meas.mesh.scale.setScalar(0.5 + p4 * 0.5);
            }

            this._cloud.material.opacity = 0.08 * (1 - p4 * 0.5);

        } else if (progress < 0.80) {
            // Phase 5: Wave function collapse - one solidifies
            var p5 = (progress - 0.65) / 0.15;
            var chosenPos2 = this._ghostPositions[this._chosenGhost];

            // Model snaps to chosen position and becomes solid
            model.visible = true;
            model.position.set(
                chosenPos2.x + (orig.x - chosenPos2.x) * p5,
                chosenPos2.y + (orig.y - chosenPos2.y) * p5,
                oz
            );
            model.scale.copy(this._origScale);

            // Non-chosen ghosts fade rapidly
            for (var g4 = 0; g4 < 4; g4++) {
                var ghostGroup4 = this._ghosts[g4];
                var fadeOut = g4 === this._chosenGhost ? (1 - p5) : (1 - p5 * 3);
                fadeOut = Math.max(0, fadeOut);
                for (var gp4 = 0; gp4 < ghostGroup4.length; gp4++) {
                    ghostGroup4[gp4].mesh.material.opacity = fadeOut * 0.3;
                    if (fadeOut <= 0) ghostGroup4[gp4].mesh.visible = false;
                }
            }

            // Measurement particles converge to zero radius
            for (var mp2 = 0; mp2 < this._measureParticles.length; mp2++) {
                var meas2 = this._measureParticles[mp2];
                meas2.mesh.material.opacity = (1 - p5) * 0.6;
                if (p5 > 0.5) meas2.mesh.visible = false;
            }

            // Collapse flash
            if (p5 < 0.3) {
                this._collapseFlash.visible = true;
                this._collapseFlash.position.set(model.position.x, model.position.y, 0);
                this._collapseFlash.material.opacity = (1 - p5 / 0.3) * 0.5;
                this._collapseFlash.scale.setScalar(0.5 + p5 * 3);
            } else {
                this._collapseFlash.visible = false;
            }

            this._cloud.material.opacity = 0.04 * (1 - p5);

        } else if (progress < 0.90) {
            // Phase 6: Collapsed copies vanish in poof
            var p6 = (progress - 0.80) / 0.10;

            model.position.set(
                orig.x,
                orig.y,
                oz
            );
            model.visible = true;
            model.scale.copy(this._origScale);

            // Trigger poof at other ghost positions
            if (!this._poofTriggered) {
                this._poofTriggered = true;
                var poofIdx = 0;
                for (var g5 = 0; g5 < 4; g5++) {
                    if (g5 === this._chosenGhost) continue;
                    var gp5 = this._ghostPositions[g5];
                    for (var pp = 0; pp < 4 && poofIdx < this._poofParticles.length; pp++) {
                        var poof = this._poofParticles[poofIdx];
                        poof.mesh.visible = true;
                        poof.mesh.position.set(gp5.x, gp5.y, 0);
                        poof.vx = (Math.random() - 0.5) * 1.5;
                        poof.vy = (Math.random() - 0.5) * 1.5;
                        poof.life = poof.maxLife;
                        poof.active = true;
                        poofIdx++;
                    }
                }
            }

            // Hide all ghosts
            for (var g6 = 0; g6 < 4; g6++) {
                for (var gp6 = 0; gp6 < this._ghosts[g6].length; gp6++) {
                    this._ghosts[g6][gp6].mesh.visible = false;
                }
            }

            this._cloud.material.opacity = 0;
            this._collapseFlash.visible = false;

        } else {
            // Phase 7: Settle
            model.position.copy(orig);
            model.scale.copy(this._origScale);
            model.visible = true;
            this._cloud.material.opacity = 0;
        }

        // Update poof particles
        for (var up = 0; up < this._poofParticles.length; up++) {
            var pf2 = this._poofParticles[up];
            if (pf2.active && pf2.life > 0) {
                pf2.life -= delta;
                pf2.mesh.position.x += pf2.vx * delta;
                pf2.mesh.position.y += pf2.vy * delta;
                var lifeRatio = Math.max(0, pf2.life / pf2.maxLife);
                pf2.mesh.material.opacity = lifeRatio * 0.5;
                pf2.mesh.scale.setScalar(0.5 + (1 - lifeRatio) * 1.0);
                if (pf2.life <= 0) {
                    pf2.active = false;
                    pf2.mesh.visible = false;
                }
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._ghosts) {
            this._ghosts.forEach(function(group) {
                group.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
            });
        }
        if (this._cloud) { scene.remove(this._cloud); this._cloud.geometry.dispose(); this._cloud.material.dispose(); }
        if (this._measureParticles) {
            this._measureParticles.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); });
        }
        if (this._collapseFlash) { scene.remove(this._collapseFlash); this._collapseFlash.geometry.dispose(); this._collapseFlash.material.dispose(); }
        if (this._poofParticles) {
            this._poofParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        this._ghosts = this._cloud = this._measureParticles = this._collapseFlash = this._poofParticles = null;
    }
};
