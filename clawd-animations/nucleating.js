export default {
    name: 'Nucleating',
    label: 'nucleating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Atom spheres - 20 small colored spheres
        this._atoms = [];
        var atomGeo = new THREE.SphereGeometry(0.035, 8, 8);
        var atomColors = [0xff6633, 0xffaa22, 0xffcc44, 0xff8844, 0xffdd55,
                          0xff5533, 0xffbb33, 0xffee66, 0xff7744, 0xffcc55,
                          0xff6622, 0xffaa44, 0xffdd33, 0xff9944, 0xffbb55,
                          0xff5544, 0xffcc22, 0xffee44, 0xff8833, 0xffaa55];

        // Lattice target positions: 3x3x2 grid centered on model
        var gridPositions = [];
        for (var gx = -1; gx <= 1; gx++) {
            for (var gy = -1; gy <= 1; gy++) {
                for (var gz = 0; gz <= 1; gz++) {
                    gridPositions.push({
                        x: this._origPos.x + gx * 0.12,
                        y: this._origPos.y + gy * 0.12,
                        z: gz * 0.12 - 0.06
                    });
                }
            }
        }

        for (var i = 0; i < 20; i++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: atomColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var atom = new THREE.Mesh(atomGeo, aMat);
            atom.visible = false;
            scene.add(atom);

            // Start at random scattered positions
            var startX = this._origPos.x + (Math.random() - 0.5) * 2.0;
            var startY = this._origPos.y + (Math.random() - 0.5) * 1.5;
            var startZ = (Math.random() - 0.5) * 0.5;

            // Target lattice position
            var target = i < gridPositions.length ? gridPositions[i] : gridPositions[i % gridPositions.length];

            // Snap timing - staggered
            var snapTime = 0.15 + (i / 20) * 0.30;

            this._atoms.push({
                mesh: atom,
                startX: startX,
                startY: startY,
                startZ: startZ,
                targetX: target.x,
                targetY: target.y,
                targetZ: target.z,
                snapTime: snapTime,
                snapDuration: 0.08,
                snapped: false,
                wobblePhase: Math.random() * Math.PI * 2
            });
        }

        // Bond lines connecting adjacent atoms in lattice
        this._bonds = [];
        var bondMat = new THREE.LineBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        // Connect adjacent grid positions
        for (var bi = 0; bi < Math.min(15, gridPositions.length); bi++) {
            var p1 = gridPositions[bi];
            // Connect to next neighbor
            var ni = (bi + 1) % gridPositions.length;
            var p2 = gridPositions[ni];
            var dist = Math.sqrt(
                Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
            );
            if (dist < 0.20) {
                var bPoints = [
                    new THREE.Vector3(p1.x, p1.y, p1.z),
                    new THREE.Vector3(p2.x, p2.y, p2.z)
                ];
                var bGeo = new THREE.BufferGeometry().setFromPoints(bPoints);
                var bMat = bondMat.clone();
                var bond = new THREE.Line(bGeo, bMat);
                bond.visible = false;
                scene.add(bond);
                this._bonds.push({
                    line: bond,
                    atomIdx1: bi,
                    atomIdx2: ni
                });
            }
        }
        // Also connect vertically and diagonally for more bonds
        for (var ci = 0; ci < Math.min(gridPositions.length - 2, 16); ci++) {
            var cp1 = gridPositions[ci];
            var cp2 = gridPositions[ci + 2];
            var cdist = Math.sqrt(
                Math.pow(cp1.x - cp2.x, 2) + Math.pow(cp1.y - cp2.y, 2) + Math.pow(cp1.z - cp2.z, 2)
            );
            if (cdist < 0.20) {
                var cbPoints = [
                    new THREE.Vector3(cp1.x, cp1.y, cp1.z),
                    new THREE.Vector3(cp2.x, cp2.y, cp2.z)
                ];
                var cbGeo = new THREE.BufferGeometry().setFromPoints(cbPoints);
                var cbMat = bondMat.clone();
                var cbLine = new THREE.Line(cbGeo, cbMat);
                cbLine.visible = false;
                scene.add(cbLine);
                this._bonds.push({
                    line: cbLine,
                    atomIdx1: ci,
                    atomIdx2: ci + 2
                });
            }
        }

        // Snap flash particles
        this._flashes = [];
        var flashGeo = new THREE.SphereGeometry(0.06, 6, 6);
        for (var f = 0; f < 10; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var flash = new THREE.Mesh(flashGeo, fMat);
            flash.visible = false;
            scene.add(flash);
            this._flashes.push({
                mesh: flash,
                life: 0,
                maxLife: 0
            });
        }
        this._flashIdx = 0;

        // Energy pulse glow
        var pulseGeo = new THREE.SphereGeometry(0.3, 16, 16);
        var pulseMat = new THREE.MeshBasicMaterial({
            color: 0xff8833, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._pulse = new THREE.Mesh(pulseGeo, pulseMat);
        this._pulse.position.copy(this._origPos);
        scene.add(this._pulse);
    },
    _emitFlash(x, y, z) {
        var f = this._flashes[this._flashIdx % this._flashes.length];
        this._flashIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y, z);
        f.life = 0.2;
        f.maxLife = 0.2;
        f.mesh.material.opacity = 0.8;
        f.mesh.scale.setScalar(1);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Atom updates
        for (var i = 0; i < this._atoms.length; i++) {
            var a = this._atoms[i];

            if (progress < 0.15) {
                // Phase 1: atoms spawn scattered, fade in
                var spawnT = progress / 0.15;
                a.mesh.visible = spawnT > (i / 20 * 0.8);
                if (a.mesh.visible) {
                    a.mesh.position.set(a.startX, a.startY, a.startZ);
                    a.mesh.material.opacity = Math.min(0.7, spawnT * 1.5);
                    // Gentle floating
                    a.mesh.position.x += Math.sin(time * 2 + a.wobblePhase) * 0.02;
                    a.mesh.position.y += Math.cos(time * 1.5 + a.wobblePhase) * 0.02;
                }
            } else if (progress < a.snapTime + a.snapDuration) {
                a.mesh.visible = true;

                if (progress < a.snapTime) {
                    // Flying toward center - accelerating
                    var flyT = (progress - 0.15) / (a.snapTime - 0.15);
                    var eased = flyT * flyT; // accelerate
                    a.mesh.position.set(
                        a.startX + (a.targetX - a.startX) * eased,
                        a.startY + (a.targetY - a.startY) * eased,
                        a.startZ + (a.targetZ - a.startZ) * eased
                    );
                    a.mesh.material.opacity = 0.7;
                } else {
                    // Snap into place
                    if (!a.snapped) {
                        a.snapped = true;
                        this._emitFlash(a.targetX, a.targetY, a.targetZ);
                    }
                    a.mesh.position.set(a.targetX, a.targetY, a.targetZ);
                    a.mesh.material.opacity = 0.8;
                }
            } else if (progress < 0.70) {
                // Rapid assembly continues
                a.mesh.position.set(a.targetX, a.targetY, a.targetZ);
                if (!a.snapped && progress >= a.snapTime) {
                    a.snapped = true;
                    this._emitFlash(a.targetX, a.targetY, a.targetZ);
                }
                a.mesh.material.opacity = 0.8;
            } else if (progress < 0.88) {
                // Lattice pulses with energy
                var pulseT = (Math.sin(time * 4 + i * 0.3) * 0.5 + 0.5);
                a.mesh.material.opacity = 0.6 + pulseT * 0.3;
                var wobble = Math.sin(time * 5 + a.wobblePhase) * 0.005;
                a.mesh.position.set(a.targetX + wobble, a.targetY + wobble, a.targetZ);
                // Color shift during pulse
                a.mesh.material.color.setRGB(
                    1, 0.6 + pulseT * 0.3, 0.2 + pulseT * 0.3
                );
            } else {
                // Fade out
                var fadeT = (progress - 0.88) / 0.12;
                a.mesh.material.opacity = 0.8 * (1 - fadeT);
                if (a.mesh.material.opacity < 0.01) a.mesh.visible = false;
            }
        }

        // Bond lines appear as atoms snap
        for (var b = 0; b < this._bonds.length; b++) {
            var bond = this._bonds[b];
            var atom1 = this._atoms[bond.atomIdx1];
            var atom2 = this._atoms[bond.atomIdx2];

            if (atom1.snapped && atom2.snapped && progress < 0.88) {
                bond.line.visible = true;
                var bondPulse = Math.sin(time * 3 + b) * 0.5 + 0.5;
                bond.line.material.opacity = 0.3 + bondPulse * 0.3;
            } else if (progress >= 0.88) {
                var bFade = (progress - 0.88) / 0.12;
                bond.line.material.opacity *= (1 - bFade * 0.1);
                if (bond.line.material.opacity < 0.01) bond.line.visible = false;
            } else {
                bond.line.visible = false;
            }
        }

        // Flash particles update
        for (var fi = 0; fi < this._flashes.length; fi++) {
            var fl = this._flashes[fi];
            if (fl.life <= 0) continue;
            fl.life -= delta;
            if (fl.life <= 0) { fl.mesh.visible = false; continue; }
            var lr = fl.life / fl.maxLife;
            fl.mesh.material.opacity = lr * 0.8;
            fl.mesh.scale.setScalar(1 + (1 - lr) * 2);
        }

        // Energy pulse glow
        var pulseOp = 0;
        if (progress >= 0.45 && progress < 0.70) {
            pulseOp = (progress - 0.45) / 0.25 * 0.1;
        } else if (progress >= 0.70 && progress < 0.88) {
            // Pulse during complete lattice phase
            pulseOp = 0.1 + Math.sin(time * 3) * 0.06;
        } else if (progress >= 0.88) {
            pulseOp = 0.1 * (1 - (progress - 0.88) / 0.12);
        }
        this._pulse.material.opacity = pulseOp;
        this._pulse.scale.setScalar(1 + Math.sin(time * 2.5) * 0.15);
        this._pulse.position.copy(orig);

        // Model stays still, slight vibration during assembly
        var vibAmt = 0;
        if (progress >= 0.15 && progress < 0.70) {
            vibAmt = 0.003;
        }
        model.position.set(
            orig.x + Math.sin(time * 15) * vibAmt,
            orig.y + Math.cos(time * 12) * vibAmt,
            0
        );

        // Settle at end
        if (progress >= 0.92) {
            model.position.copy(orig);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._atoms) {
            this._atoms.forEach(function(a) {
                scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose();
            });
        }
        if (this._bonds) {
            this._bonds.forEach(function(b) {
                scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose();
            });
        }
        if (this._flashes) {
            this._flashes.forEach(function(f) {
                scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose();
            });
        }
        if (this._pulse) { scene.remove(this._pulse); this._pulse.geometry.dispose(); this._pulse.material.dispose(); }
        this._atoms = this._bonds = this._flashes = this._pulse = null;
    }
};
