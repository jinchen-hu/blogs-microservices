const express = require("express");
const { randomBytes } = require("crypto");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

const commentsByPostsId = {};

app.get("/posts/:id/comments", (req, res) => {
  res.send(commentsByPostsId[req.params.id] || []);
});

app.post("/posts/:id/comments", async (req, res) => {
  const commentId = randomBytes(4).toString("hex");
  const { content } = req.body;
  const comments = commentsByPostsId[req.params.id] || [];

  comments.push({ id: commentId, content, status: "pending" });
  commentsByPostsId[req.params.id] = comments;

  await axios.post("http://blog-events-bus-srv:4005/events", {
    type: "CommentCreated",
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: "pending",
    },
  });

  res.status(201).send(comments);
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;

  if (type === "CommentModerated") {
    const { postId, id, status, content } = data;

    const comments = commentsByPostsId[postId];

    const comment = comments.find((comment) => comment.id === id);

    comment.status = status;

    await axios.post("http://blog-events-bus-srv:4005/events", {
      type: "CommentUpdated",
      data: {
        id,
        postId,
        status,
        content,
      },
    });
  }

  console.log("Event received", req.body.type);
  res.send({});
});

app.listen(4001, () => {
  console.log("Comments listening on 4001");
});
