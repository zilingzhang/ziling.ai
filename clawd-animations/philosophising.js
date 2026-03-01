export default {
    name: 'Philosophising',
    label: 'philosophising',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Greek column pillars (cylinders) rising around model
        this._columns = [];
        var colGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8);
        var colColors = [0xddcc99, 0xccbb88, 0xeedd99, 0xddccaa, 0xccddaa, 0xeeddaa];
        for (var i = 0; i < 6; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: colColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var col = new THREE.Mesh(colGeo, cMat);
            col.visible = false;
            scene.add(col);

            var angle = (i / 6) * Math.PI * 2;
            var dist = 0.35;
            this._columns.push({
                mesh: col,
                angle: angle,
                dist: dist,
                x: ox + Math.cos(angle) * dist,
                riseDelay: i * 0.08,
                risen: false
            });
        }

        // Column capitals (small box on top of each column)
        this._capitals = [];
        var capGeo = new THREE.BoxGeometry(0.05, 0.015, 0.05);
        for (var c = 0; c < 6; c++) {
            var capMat = new THREE.MeshBasicMaterial({
                color: 0xeeddaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cap = new THREE.Mesh(capGeo, capMat);
            cap.visible = false;
            scene.add(cap);
            this._capitals.push({ mesh: cap });
        }

        // Thought spiral (helix of small particles ascending)
        this._spiralParticles = [];
        var spGeo = new THREE.SphereGeometry(0.01, 5, 5);
        for (var s = 0; s < 30; s++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: s % 3 === 0 ? 0xffddaa : (s % 3 === 1 ? 0xddcc88 : 0xeebb77),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sp = new THREE.Mesh(spGeo, spMat);
            sp.visible = false;
            scene.add(sp);
            this._spiralParticles.push({
                mesh: sp,
                helixAngle: (s / 30) * Math.PI * 6,
                helixHeight: (s / 30),
                helixRadius: 0.08
            });
        }

        // Wisdom aura (expanding concentric rings)
        this._wisdomRings = [];
        for (var w = 0; w < 4; w++) {
            var wrGeo = new THREE.TorusGeometry(0.1 + w * 0.08, 0.004, 6, 32);
            var wrMat = new THREE.MeshBasicMaterial({
                color: w % 2 === 0 ? 0xddcc77 : 0xccbb66,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wr = new THREE.Mesh(wrGeo, wrMat);
            wr.position.set(ox, oy + 0.2, 0);
            wr.rotation.x = Math.PI * 0.5;
            wr.visible = false;
            scene.add(wr);
            this._wisdomRings.push({
                mesh: wr,
                baseRadius: 0.1 + w * 0.08,
                active: false,
                startTime: 0
            });
        }

        // Wisdom glow
        var glowGeo = new THREE.SphereGeometry(0.45, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xddbb66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy + 0.05, -0.05);
        scene.add(this._glow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.12) {
            // Phase 1: Columns rise from below
            var t = progress / 0.12;
            for (var i = 0; i < 6; i++) {
                var col = this._columns[i];
                if (t > col.riseDelay) {
                    var riseProg = Math.min(1, (t - col.riseDelay) * 3);
                    col.mesh.visible = true;
                    col.mesh.material.opacity = riseProg * 0.5;
                    col.mesh.position.set(col.x, oy - 0.2 + riseProg * 0.3, 0);
                    col.mesh.scale.y = riseProg;

                    this._capitals[i].mesh.visible = riseProg > 0.8;
                    this._capitals[i].mesh.material.opacity = riseProg * 0.5;
                    this._capitals[i].mesh.position.set(col.x, col.mesh.position.y + 0.2 * riseProg, 0);
                }
            }
            this._glow.material.opacity = t * 0.02;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Thought spiral begins ascending
            var t2 = (progress - 0.12) / 0.18;

            for (var j = 0; j < 6; j++) {
                this._columns[j].mesh.material.opacity = 0.5;
                this._columns[j].mesh.position.set(this._columns[j].x, oy + 0.1, 0);
                this._columns[j].mesh.scale.y = 1;
                this._capitals[j].mesh.position.set(this._columns[j].x, oy + 0.3, 0);
                this._capitals[j].mesh.material.opacity = 0.5;
            }

            // Spiral particles appear
            var visibleCount = Math.floor(t2 * 30);
            for (var si = 0; si < 30; si++) {
                if (si < visibleCount) {
                    this._spiralParticles[si].mesh.visible = true;
                    this._spiralParticles[si].mesh.material.opacity = 0.5;
                }
            }

            this._glow.material.opacity = 0.02 + t2 * 0.03;

            // Model poses like The Thinker (slight lean, head tilt)
            model.rotation.z = t2 * 0.04;
            model.position.set(ox + t2 * 0.01, oy, oz);
        } else if (progress < 0.60) {
            // Phase 3: Full philosophising, spiral ascends, wisdom aura builds
            var t3 = (progress - 0.30) / 0.30;
            this._glow.material.opacity = 0.05 + t3 * 0.06 + Math.sin(time * 1.5) * 0.02;
            this._glow.scale.setScalar(1 + t3 * 0.2);

            // All spiral particles visible and moving
            for (var sk = 0; sk < 30; sk++) {
                this._spiralParticles[sk].mesh.visible = true;
                this._spiralParticles[sk].mesh.material.opacity = 0.5 + Math.sin(time * 3 + sk * 0.5) * 0.15;
            }

            // Activate wisdom rings
            for (var wi = 0; wi < 4; wi++) {
                if (t3 > wi * 0.2 && !this._wisdomRings[wi].active) {
                    this._wisdomRings[wi].active = true;
                    this._wisdomRings[wi].startTime = time;
                    this._wisdomRings[wi].mesh.visible = true;
                }
            }

            // Columns pulse gently
            for (var ci = 0; ci < 6; ci++) {
                this._columns[ci].mesh.material.opacity = 0.5 + Math.sin(time * 2 + ci) * 0.08;
            }

            model.rotation.z = 0.04 + Math.sin(time * 0.5) * 0.01;
            model.position.set(ox + 0.01, oy + Math.sin(time * 0.8) * 0.003, oz);
        } else if (progress < 0.80) {
            // Phase 4: Peak wisdom, rings expand outward
            var t4 = (progress - 0.60) / 0.20;
            this._glow.material.opacity = 0.11 + Math.sin(time * 2) * 0.03;
            this._glow.material.color.setHex(0xeedd88);
            this._glow.scale.setScalar(1.2 + t4 * 0.2);

            for (var sl = 0; sl < 30; sl++) {
                this._spiralParticles[sl].mesh.material.opacity = 0.6 + Math.sin(time * 4 + sl * 0.3) * 0.2;
            }

            model.rotation.z = 0.04 + Math.sin(time * 0.4) * 0.015;
            model.position.set(ox + 0.01, oy + 0.005, oz);
        } else if (progress < 0.92) {
            // Phase 5: Settling, columns and spiral fade
            var t5 = (progress - 0.80) / 0.12;
            this._glow.material.opacity = 0.12 * (1 - t5 * 0.6);

            for (var cm = 0; cm < 6; cm++) {
                this._columns[cm].mesh.material.opacity = 0.5 * (1 - t5 * 0.5);
                this._capitals[cm].mesh.material.opacity = 0.5 * (1 - t5 * 0.5);
            }

            for (var sm = 0; sm < 30; sm++) {
                this._spiralParticles[sm].mesh.material.opacity *= (1 - t5 * 0.04);
            }

            model.rotation.z = 0.04 * (1 - t5);
            model.position.set(ox + 0.01 * (1 - t5), oy + 0.005 * (1 - t5), oz);
        } else {
            // Phase 6: Final fade
            var t6 = (progress - 0.92) / 0.08;
            this._glow.material.opacity = 0.05 * (1 - t6);

            for (var cn = 0; cn < 6; cn++) {
                this._columns[cn].mesh.material.opacity = 0.25 * (1 - t6);
                this._capitals[cn].mesh.material.opacity = 0.25 * (1 - t6);
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update spiral helix positions
        for (var su = 0; su < 30; su++) {
            var sp = this._spiralParticles[su];
            if (!sp.mesh.visible) continue;
            var ha = sp.helixAngle + time * 1.5;
            var hh = (sp.helixHeight + time * 0.15) % 1.0;
            sp.mesh.position.set(
                ox + Math.cos(ha) * sp.helixRadius,
                oy - 0.05 + hh * 0.4,
                Math.sin(ha) * sp.helixRadius * 0.3
            );
        }

        // Update wisdom rings (expand and fade cyclically)
        for (var wu = 0; wu < 4; wu++) {
            var ring = this._wisdomRings[wu];
            if (!ring.active) continue;
            var elapsed = time - ring.startTime;
            var cycleDur = 2.5 + wu * 0.5;
            var cycleT = (elapsed % cycleDur) / cycleDur;
            ring.mesh.scale.setScalar(1 + cycleT * 1.5);
            ring.mesh.material.opacity = (1 - cycleT) * 0.3;
            ring.mesh.rotation.z += delta * 0.3;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._columns) {
            this._columns.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._capitals) {
            this._capitals.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._spiralParticles) {
            this._spiralParticles.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._wisdomRings) {
            this._wisdomRings.forEach(function(w) {
                scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._columns = this._capitals = this._spiralParticles = this._wisdomRings = this._glow = null;
    }
};
