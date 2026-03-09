import p5 from 'p5';

const sketch = (p) => {

    let raindrops = [];
    let gravity;
    let wind;

    let handPose;
    let video;
    let hands = [];

    let spawnX = 0;
    let spawnY = 0;
    let isPinching = false;

    // Video display rect (16:9 fitted)
    let vx, vy, vw, vh;

    function calcVideoRect() {
        let aspect = 16 / 9;
        if (p.width / p.height > aspect) {
            // Window is wider than 16:9 — pillarbox
            vh = p.height;
            vw = vh * aspect;
        } else {
            // Window is taller than 16:9 — letterbox
            vw = p.width;
            vh = vw / aspect;
        }vx = (p.width - vw) / 2;
        vy = (p.height - vh) / 2;
    }

    class Raindrop {
        constructor(x, y) {
            this.location = p.createVector(p.random(x - 10, x + 10), p.random(y - 10, y + 10));
            this.size = 5;
            this.velocity = p.createVector(p.random(-0.2, 0.2), p.random(-0.2, 0.2));
            this.age = 0;
            this.alive = true;
            this.from = p.color(255, 0, 0);
            this.to = p.color(0, 0, 255);
        }

        show() {
            let lerpAmount = p.map(this.age, 0, 240, 0, 1);
            let ageSize = p.map(this.age, 0, 240, 5, 20);

            let noiseAvg = (this.nx + this.ny) / 2;
            let zScale = p.map(noiseAvg, 0, 1, 0.1, 3.0);
            let scaledSize = ageSize * zScale;

            let fillColor = p.lerpColor(this.from, this.to, lerpAmount);

            let yellowAmount = p.map(noiseAvg, 0, 1, 0, 150);

            p.fill(fillColor);
            p.noStroke();
            p.rect(this.location.x, this.location.y, scaledSize, scaledSize);
        }

        update() {
            let noiseScale = 0.01;
            this.nx = p.noise(this.location.x * noiseScale, this.location.y * noiseScale, this.age * 0.01);
            this.ny = p.noise(this.location.x * noiseScale + 1000, this.location.y * noiseScale + 1000, this.age * 0.01);

            let noiseForceX = p.map(this.nx, 0, 1, -0.1, 0.1);
            let noiseForceY = p.map(this.ny, 0, 1, -0.1, 0.1);

            let noiseForce = p.createVector(noiseForceX, noiseForceY);
            this.velocity.add(gravity);
            this.velocity.add(wind);
            this.velocity.add(noiseForce);
            this.location.add(this.velocity);

            // Kill particles that leave the video rect
            if (this.location.y > vy + vh || this.location.y < vy ||
                this.location.x > vx + vw || this.location.x < vx) {
                this.alive = false;
            }
            this.age += 1;
            if (this.age > 240) {
                this.alive = false;
            }
        }
    }

    function modelLoaded() {
        console.log("Model loaded!");
    }

    function gotHands(results) {
        hands = results;
    }

    function getHandByLabel(label) {
        for (let hand of hands) {
            if (hand.handedness === label) return hand;
        }
        return null;
    }

    p.setup = async () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        video = p.createCapture(p.VIDEO);
        video.hide();
        video.size(1920, 1080);

        calcVideoRect();

        handPose = await ml5.handPose(video, modelLoaded);
        await handPose.detectStart(video, gotHands);

        gravity = p.createVector(0, 0.02);
        wind = p.createVector(0.05, 0);
    };

    p.draw = () => {
        let rightHand = getHandByLabel("Left");
        let leftHand = getHandByLabel("Right");

        let windXAmount = p.map(rightHand?.keypoints ? rightHand.keypoints[8].x : p.mouseX, 0, p.width, -0.05, 0.05);
        let windYAmount = p.map(rightHand?.keypoints ? rightHand.keypoints[8].y : p.mouseY, 0, p.height, -0.2, 0.2);
        wind.set(windXAmount, windYAmount);

        // Clear full canvas, then draw video in the 16:9 rect
        p.background(0);
        p.image(video, vx, vy, vw, vh);

        // Scale factors: video coords -> video display rect coords
        let sx = vw / video.width;
        let sy = vh / video.height;

        // Instructions
        p.fill(255,0,0);
        p.stroke(0,0,255);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(22);
        p.text('Pinch your left thumb and index finger to make particles come out of your right index finger', vx + 10, vy + 10, vw / 2);

        // Check left hand pinch
        isPinching = false;
        if (leftHand) {
            let thumbTip = leftHand.keypoints[4];
            let indexTip = leftHand.keypoints[8];
            let dx = (thumbTip.x - indexTip.x) * sx;
            let dy = (thumbTip.y - indexTip.y) * sy;
            let dist = Math.sqrt(dx * dx + dy * dy);
            isPinching = dist < 40;

            if (isPinching) {
                let thumbX = thumbTip.x * sx + vx;
                let thumbY = thumbTip.y * sy + vy;
                let indexX = indexTip.x * sx + vx;
                let indexY = indexTip.y * sy + vy;

                let midX = (thumbX + indexX) / 2;
                let midY = (thumbY + indexY) / 2;

                let d = p.dist(thumbX, thumbY, indexX, indexY);
                let angle = p.atan2(indexY - thumbY, indexX - thumbX);

                p.push();
                p.translate(midX, midY);
                p.rotate(angle);
                p.noFill();
                p.stroke(0, 255, 0);
                p.strokeWeight(2);
                p.ellipse(0, 0, d + 30, d * 0.6 + 20);
                p.pop();
            }
        }

        // Get right hand index finger tip as spawn point (offset into video rect)
        if (rightHand) {
            let indexFinger = rightHand.keypoints[8];
            spawnX = indexFinger.x * sx + vx;
            spawnY = indexFinger.y * sy + vy;
        }

        // Spawn particles
        if (isPinching && rightHand) {
            for (let i = 0; i < 5; i++) {
                raindrops.push(new Raindrop(spawnX, spawnY));
            }
        }

        // Update and show particles
        for (let i = raindrops.length - 1; i >= 0; i--) {
            raindrops[i].update();
            raindrops[i].show();
            if (!raindrops[i].alive) {
                raindrops.splice(i, 1);
            }
        }

        // Draw hand keypoints (offset into video rect)
        for (let i = 0; i < hands.length; i++) {
            let hand = hands[i];
            for (let j = 0; j < hand.keypoints.length; j++) {
                let keypoint = hand.keypoints[j];
                p.fill(0, 255, 0);
                if (j === 4) p.fill(255, 0, 0);
                if (j === 8) p.fill(0, 0, 255);
                p.noStroke();
                p.circle(keypoint.x * sx + vx, keypoint.y * sy + vy, 10);
            }
        }
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        calcVideoRect();
    };
};

new p5(sketch, document.getElementById('sketch-container'));





