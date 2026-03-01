export default {
    name: 'Ionizing',
    label: 'ionizing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Left electrode cylinder
        var elecGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
        var elecMatL = new THREE.MeshBasicMaterial({
            color: 0x4444aa, transparent: true, opacity: 0
        });
        this._electrodeL = new THREE.Mesh(elecGeo, elecMatL);
        this._electrodeL.position.set(this._origPos.x - 0.7, this._origPos.y, 0);
        scene.add(this._electrodeL);

        // Right electrode cylinder
        var elecMatR = new THREE.MeshBasicMaterial({
            color: 0xaa4444, transparent: true, opacity: 0
        });
        this._electrodeR = new THREE.Mesh(elecGeo, elecMatR);
        this._electrodeR.position.set(this._origPos.x + 0.7, this._origPos.y, 0);
        scene.add(this._electrodeR);

        // Electrode tip glows
        var tipGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var tipMatL = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._tipL = new THREE.Mesh(tipGeo, tipMatL);
        this._tipL.position.set(this._origPos.x - 0.7, this._origPos.y + 0.3, 0);
        scene.add(this._tipL);

        var tipMatR = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._tipR = new THREE.Mesh(tipGeo, tipMatR);
        this._tipR.position.set(this._origPos.x + 0.7, this._origPos.y + 0.3, 0);
        scene.add(this._tipR);

        // Electric arcs - 6 zigzag line geometries
        this._arcs = [];
        for (var a = 0; a < 6; a++) {
            var arcMat = new THREE.LineBasicMaterial({
                color: a % 2 === 0 ? 0x88ccff : 0xaaddff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var points = [];
            var segments = 12;
            for (var s = 0; s <= segments; s++) {
                points.push(new THREE.Vector3(0, 0, 0));
            }
            var arcGeo = new THREE.BufferGeometry().setFromPoints(points);
            var arc = new THREE.Line(arcGeo, arcMat);
            arc.visible = false;
            scene.add(arc);
            this._arcs.push({
                line: arc,
                segments: segments,
                yOffset: (a - 2.5) * 0.08,
                flickerSpeed: 8 + a * 3,
                active: false
            });
        }

        // Charge particles (positive red, negative blue)
        this._charges = [];
        var chargeGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var c = 0; c < 20; c++) {
            var isPositive = c < 10;
            var cMat = new THREE.MeshBasicMaterial({
                color: isPositive ? 0xff6644 : 0x4466ff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var charge = new THREE.Mesh(chargeGeo, cMat);
            charge.visible = false;
            scene.add(charge);
            this._charges.push({
                mesh: charge,
                positive: isPositive,
                startX: this._origPos.x + (Math.random() - 0.5) * 0.3,
                startY: this._origPos.y + (Math.random() - 0.5) * 0.4,
                targetX: isPositive ? this._origPos.x + 0.55 : this._origPos.x - 0.55,
                separated: false,
                speed: 0.3 + Math.random() * 0.4,
                wobblePhase: Math.random() * Math.PI * 2
            });
        }

        // Central plasma glow
        var plasmaGeo = new THREE.SphereGeometry(0.35, 16, 16);
        var plasmaMat = new THREE.MeshBasicMaterial({
            color: 0xaaccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._plasma = new THREE.Mesh(plasmaGeo, plasmaMat);
        this._plasma.position.copy(this._origPos);
        scene.add(this._plasma);
    },
    _updateArcGeometry(arc, leftX, rightX, y, time, THREE) {
        var positions = arc.line.geometry.attributes.position;
        var seg = arc.segments;
        for (var i = 0; i <= seg; i++) {
            var t = i / seg;
            var x = leftX + (rightX - leftX) * t;
            var zigzag = Math.sin(t * Math.PI * 4 + time * arc.flickerSpeed) * 0.06 *
                         Math.sin(t * Math.PI);
            var jitter = (Math.random() - 0.5) * 0.02;
            positions.setXYZ(i, x, y + arc.yOffset + zigzag + jitter, 0.05);
        }
        positions.needsUpdate = true;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var oz = orig.z;

        // Phase intensity
        var intensity = 0;
        if (progress < 0.10) {
            intensity = progress / 0.10;
        } else if (progress < 0.82) {
            intensity = 1;
        } else {
            intensity = 1 - (progress - 0.82) / 0.18;
        }

        // Electrodes appear
        var elecOpacity = Math.min(1, intensity) * 0.7;
        this._electrodeL.material.opacity = elecOpacity;
        this._electrodeR.material.opacity = elecOpacity;
        this._tipL.material.opacity = intensity * (0.4 + Math.sin(time * 5) * 0.2);
        this._tipR.material.opacity = intensity * (0.4 + Math.sin(time * 5 + 1) * 0.2);

        // Model vibration from ionization
        var vibrateAmt = 0;
        if (progress >= 0.10 && progress < 0.82) {
            vibrateAmt = Math.min(1, (progress - 0.10) / 0.20);
        } else if (progress >= 0.82) {
            vibrateAmt = intensity;
        }
        var vx = Math.sin(time * 30) * 0.008 * vibrateAmt;
        var vy = Math.cos(time * 25) * 0.005 * vibrateAmt;
        model.position.set(orig.x + vx, orig.y + vy, oz);

        // Electric arcs
        var leftTipX = orig.x - 0.65;
        var rightTipX = orig.x + 0.65;
        for (var a = 0; a < this._arcs.length; a++) {
            var arc = this._arcs[a];
            if (progress >= 0.10 && progress < 0.82) {
                // Arcs flicker on and off
                var flicker = Math.sin(time * arc.flickerSpeed + a * 2) > -0.3;
                arc.line.visible = flicker;
                if (flicker) {
                    this._updateArcGeometry(arc, leftTipX, rightTipX, orig.y, time, THREE);
                    // Intensify arcs in plasma burst phase (65-82%)
                    var arcIntensity = progress >= 0.65 ? 0.8 + Math.sin(time * 8) * 0.2 : 0.5 + Math.sin(time * 4 + a) * 0.2;
                    arc.line.material.opacity = arcIntensity;
                }
            } else {
                arc.line.visible = false;
                arc.line.material.opacity = 0;
            }
        }

        // Charge particle separation
        var separationProgress = 0;
        if (progress >= 0.30 && progress < 0.65) {
            separationProgress = (progress - 0.30) / 0.35;
        } else if (progress >= 0.65 && progress < 0.82) {
            separationProgress = 1;
        } else if (progress >= 0.82) {
            separationProgress = 1;
        }

        for (var c = 0; c < this._charges.length; c++) {
            var ch = this._charges[c];
            if (progress < 0.15) {
                ch.mesh.visible = false;
            } else if (progress < 0.82) {
                ch.mesh.visible = true;
                var wobble = Math.sin(time * 4 + ch.wobblePhase) * 0.02;
                var cx = ch.startX + (ch.targetX - ch.startX) * separationProgress;
                var cy = ch.startY + wobble;
                ch.mesh.position.set(cx, cy, 0.05);
                ch.mesh.material.opacity = Math.min(1, (progress - 0.15) / 0.10) * 0.7;
                ch.mesh.scale.setScalar(0.8 + Math.sin(time * 3 + c) * 0.2);
            } else {
                // Fade out
                ch.mesh.material.opacity *= 0.95;
                if (ch.mesh.material.opacity < 0.01) ch.mesh.visible = false;
            }
        }

        // Plasma glow
        var plasmaIntensity = 0;
        if (progress >= 0.20 && progress < 0.65) {
            plasmaIntensity = (progress - 0.20) / 0.45 * 0.15;
        } else if (progress >= 0.65 && progress < 0.82) {
            // Plasma burst
            var burstT = (progress - 0.65) / 0.17;
            plasmaIntensity = 0.15 + burstT * 0.25;
        } else if (progress >= 0.82) {
            plasmaIntensity = 0.4 * intensity;
        }
        this._plasma.material.opacity = plasmaIntensity + Math.sin(time * 6) * 0.03;
        this._plasma.scale.setScalar(1 + plasmaIntensity * 1.5 + Math.sin(time * 4) * 0.08);
        this._plasma.position.set(model.position.x, model.position.y, -0.1);

        // Power down color shift
        if (progress >= 0.82) {
            var coolT = (progress - 0.82) / 0.18;
            this._plasma.material.color.setRGB(0.67 + coolT * 0.1, 0.8 + coolT * 0.1, 1);
        }

        // Settle
        if (progress >= 0.92) {
            var settle = (progress - 0.92) / 0.08;
            model.position.set(
                orig.x + vx * (1 - settle),
                orig.y + vy * (1 - settle),
                oz
            );
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._electrodeL) { scene.remove(this._electrodeL); this._electrodeL.geometry.dispose(); this._electrodeL.material.dispose(); }
        if (this._electrodeR) { scene.remove(this._electrodeR); this._electrodeR.geometry.dispose(); this._electrodeR.material.dispose(); }
        if (this._tipL) { scene.remove(this._tipL); this._tipL.geometry.dispose(); this._tipL.material.dispose(); }
        if (this._tipR) { scene.remove(this._tipR); this._tipR.geometry.dispose(); this._tipR.material.dispose(); }
        if (this._arcs) {
            this._arcs.forEach(function(a) {
                scene.remove(a.line); a.line.geometry.dispose(); a.line.material.dispose();
            });
        }
        if (this._charges) {
            this._charges.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._plasma) { scene.remove(this._plasma); this._plasma.geometry.dispose(); this._plasma.material.dispose(); }
        this._electrodeL = this._electrodeR = this._tipL = this._tipR = null;
        this._arcs = this._charges = this._plasma = null;
    }
};
