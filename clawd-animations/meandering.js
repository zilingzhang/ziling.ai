export default {
    name: 'Meandering',
    label: 'meandering',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Lazy trail particles
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.01, 6, 6);
        for (var i = 0; i < 25; i++) {
            var tColors = [0x66aacc, 0x88ccaa, 0x77bbbb, 0x99ddbb, 0x55aa99];
            var tMat = new THREE.MeshBasicMaterial({
                color: tColors[i % tColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._trail.push({ mesh: trail, age: 99 });
        }
        this._trailIdx = 0;

        // Ambient nature particles (floating motes)
        this._motes = [];
        var moteGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var j = 0; j < 15; j++) {
            var mColors = [0xaaddcc, 0xccffee, 0x88ccbb];
            var mMat = new THREE.MeshBasicMaterial({
                color: mColors[j % mColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mote = new THREE.Mesh(moteGeo, mMat);
            mote.visible = false;
            scene.add(mote);
            this._motes.push({
                mesh: mote,
                baseX: this._origPos.x + (Math.random() - 0.5) * 1.0,
                baseY: this._origPos.y + (Math.random() - 0.5) * 0.5,
                baseZ: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.8
            });
        }

        // Gentle footstep rings
        this._steps = [];
        var stepGeo = new THREE.RingGeometry(0.01, 0.025, 10);
        for (var k = 0; k < 8; k++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x88bbaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var step = new THREE.Mesh(stepGeo, sMat);
            step.rotation.x = -Math.PI / 2;
            step.visible = false;
            scene.add(step);
            this._steps.push({ mesh: step, life: 0, maxLife: 0, scale: 0 });
        }
        this._stepIdx = 0;

        // Wandering path waypoints (precomputed gentle curve)
        this._waypoints = [];
        var wpCount = 8;
        var angle = 0;
        var wx = 0;
        var wy = 0;
        for (var w = 0; w < wpCount; w++) {
            angle += (Math.random() - 0.5) * 1.2;
            wx += Math.cos(angle) * 0.15;
            wy += Math.sin(angle) * 0.08;
            this._waypoints.push({ x: wx, y: wy });
        }

        this._lastTrail = 0;
        this._lastStep = 0;
    },
    _getWanderPos(t) {
        // Interpolate along waypoints
        var idx = t * (this._waypoints.length - 1);
        var i0 = Math.floor(idx);
        var i1 = Math.min(i0 + 1, this._waypoints.length - 1);
        var frac = idx - i0;
        // Smooth step
        var sf = frac * frac * (3 - 2 * frac);
        return {
            x: this._waypoints[i0].x + (this._waypoints[i1].x - this._waypoints[i0].x) * sf,
            y: this._waypoints[i0].y + (this._waypoints[i1].y - this._waypoints[i0].y) * sf
        };
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Activate motes
        for (var mi = 0; mi < this._motes.length; mi++) {
            var m = this._motes[mi];
            m.mesh.visible = progress > 0.05 && progress < 0.92;
            if (m.mesh.visible) {
                var mFade = progress < 0.1 ? (progress - 0.05) / 0.05 : (progress > 0.85 ? (0.92 - progress) / 0.07 : 1.0);
                m.mesh.position.set(
                    m.baseX + Math.sin(time * m.speed + m.phase) * 0.08,
                    m.baseY + Math.cos(time * m.speed * 0.7 + m.phase) * 0.05,
                    m.baseZ + Math.sin(time * 0.3 + m.phase) * 0.02
                );
                m.mesh.material.opacity = 0.25 * Math.max(0, mFade);
            }
        }

        if (progress < 0.06) {
            // Gentle start
            var t = progress / 0.06;
            model.position.set(orig.x, orig.y, orig.z);
            model.scale.copy(this._origScale);
        } else if (progress < 0.22) {
            // First wandering segment
            var t2 = (progress - 0.06) / 0.16;
            var wp = this._getWanderPos(t2 * 0.3);
            var walkBob = Math.abs(Math.sin(time * 3)) * 0.015;

            model.position.set(orig.x + wp.x, orig.y + wp.y + walkBob, orig.z);
            // Gentle lean in direction of travel
            model.rotation.z = wp.x * 0.15;
            model.scale.setScalar(gs);

            // Trail
            if (time - this._lastTrail > 0.12) {
                var tr = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr.mesh.visible = true;
                tr.mesh.position.set(model.position.x, model.position.y - 0.05, 0);
                tr.age = 0;
                tr.mesh.material.opacity = 0.3;
                this._lastTrail = time;
            }

            // Footsteps
            if (time - this._lastStep > 0.35) {
                var st = this._steps[this._stepIdx % this._steps.length];
                this._stepIdx++;
                st.mesh.visible = true;
                st.mesh.position.set(model.position.x, orig.y - 0.19, 0);
                st.scale = 0.3;
                st.life = 1.5;
                st.maxLife = 1.5;
                st.mesh.material.opacity = 0.3;
                this._lastStep = time;
            }
        } else if (progress < 0.32) {
            // Pause: stop and look around
            var t3 = (progress - 0.22) / 0.10;
            var lastWp = this._getWanderPos(0.3);
            model.position.set(orig.x + lastWp.x, orig.y + lastWp.y, orig.z);

            // Look around: slight rotation back and forth
            model.rotation.z = Math.sin(t3 * Math.PI * 2) * 0.12;
            model.scale.setScalar(gs);
        } else if (progress < 0.55) {
            // Second wandering segment (different direction)
            var t4 = (progress - 0.32) / 0.23;
            var wp2 = this._getWanderPos(0.3 + t4 * 0.35);
            var walkBob2 = Math.abs(Math.sin(time * 3.2)) * 0.015;

            model.position.set(orig.x + wp2.x, orig.y + wp2.y + walkBob2, orig.z);
            model.rotation.z = wp2.x * 0.12;
            model.scale.setScalar(gs);

            if (time - this._lastTrail > 0.1) {
                var tr2 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr2.mesh.visible = true;
                tr2.mesh.position.set(model.position.x, model.position.y - 0.05, 0);
                tr2.age = 0;
                tr2.mesh.material.opacity = 0.3;
                this._lastTrail = time;
            }

            if (time - this._lastStep > 0.3) {
                var st2 = this._steps[this._stepIdx % this._steps.length];
                this._stepIdx++;
                st2.mesh.visible = true;
                st2.mesh.position.set(model.position.x, orig.y - 0.19, 0);
                st2.scale = 0.3;
                st2.life = 1.5;
                st2.maxLife = 1.5;
                st2.mesh.material.opacity = 0.3;
                this._lastStep = time;
            }
        } else if (progress < 0.62) {
            // Another pause
            var t5 = (progress - 0.55) / 0.07;
            var lastWp2 = this._getWanderPos(0.65);
            model.position.set(orig.x + lastWp2.x, orig.y + lastWp2.y, orig.z);
            model.rotation.z = Math.sin(t5 * Math.PI * 1.5) * 0.1;
        } else if (progress < 0.82) {
            // Final wandering, drifting back toward origin
            var t6 = (progress - 0.62) / 0.20;
            var wp3 = this._getWanderPos(0.65 + t6 * 0.35);
            // Blend back toward origin
            var returnBlend = t6 * t6;
            var px = orig.x + wp3.x * (1 - returnBlend);
            var py = orig.y + wp3.y * (1 - returnBlend);
            var walkBob3 = Math.abs(Math.sin(time * 2.8)) * 0.012;

            model.position.set(px, py + walkBob3, orig.z);
            model.rotation.z = (px - orig.x) * 0.1;
            model.scale.setScalar(gs);

            if (time - this._lastTrail > 0.1) {
                var tr3 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr3.mesh.visible = true;
                tr3.mesh.position.set(model.position.x, model.position.y - 0.05, 0);
                tr3.age = 0;
                tr3.mesh.material.opacity = 0.25;
                this._lastTrail = time;
            }
        } else {
            // Settle
            var t7 = (progress - 0.82) / 0.18;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update trail
        for (var ti = 0; ti < this._trail.length; ti++) {
            var tp = this._trail[ti];
            if (!tp.mesh.visible) continue;
            tp.age += delta;
            if (tp.age > 3.0) { tp.mesh.visible = false; continue; }
            tp.mesh.material.opacity = 0.3 * Math.max(0, 1 - tp.age / 3.0);
        }

        // Update footstep rings
        for (var si = 0; si < this._steps.length; si++) {
            var sp = this._steps[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.scale += delta * 0.8;
            sp.mesh.scale.setScalar(sp.scale);
            sp.mesh.material.opacity = 0.3 * (sp.life / sp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._trail) {
            this._trail.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._motes) {
            this._motes.forEach(function(m) {
                scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                m.mesh.material.dispose();
            });
        }
        if (this._steps) {
            this._steps.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._trail = this._motes = this._steps = null;
    }
};
