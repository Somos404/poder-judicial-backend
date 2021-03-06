const config = require("../config/auth.config")
const db = require("../models")
const User = db.user
const Role = db.role

var jwt = require("jsonwebtoken")
var bcrypt = require("bcryptjs")

exports.signup = (req, res) => {
  console.log("llegaste pillin");
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  })

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ msg: err })
      return;
    }

    if (req.body.role) {
      Role.find(
        {
          name: { $in: req.body.role }
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({ msg: err })
            return
          }

          user.roles = roles.map(role => role._id)
          user.save(err => {
            if (err) {
              res.status(500).send({ msg: err })
              return;
            }

            res.status(200).send({ msg: "Se registro el usuario correctamente!" })
          })
        }
      )
    } else {
      Role.findOne({ name: "user" }, (err, role) => {
        if (err) {
          res.status(500).send({ msg: err })
          return
        }

        user.roles = [role._id];
        user.save(err => {
          if (err) {
            res.status(500).send({ msg: err })
            return
          }

          res.status(200).send({ msg: "Se registro el usuario correctamente!" })
        })
      })
    }
  })
}

exports.signin = (req, res) => {
  User.findOne({
    email: req.body.email
  })
    .populate("roles", "-__v")
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err })
        return;
      }

      if (!user) {
        return res.send({ message: "El nombre de usuario no existe." })
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      )

      if (!passwordIsValid) {
        return res.send({
          accessToken: null,
          message: "Clave incorrecta" 
        })
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      })

      var authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase())
      }
      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        roles: authorities,
        accessToken: token
      })
    })
}

exports.delete = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
  } catch (err) {
    res.status(404).send(err);
  }
  res.status(200).send({ msg: "Usuario borrado exitosamente" });
};
