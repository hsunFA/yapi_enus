const groupModel = require('../models/group.js');
const yapi = require('../yapi.js');
const baseController = require('./base.js');
const projectModel = require('../models/project.js');
const userModel = require('../models/user.js');
const interfaceModel = require('../models/interface.js');
const interfaceColModel = require('../models/interfaceCol.js');
const interfaceCaseModel = require('../models/interfaceCase.js');

const rolename = {
  owner: "Group Owner",
  dev: "Developer",
  guest: "Guest"
};

class groupController extends baseController {
  constructor(ctx) {
    super(ctx);

    const id = 'number';
    const group_name = {
      type: 'string',
      minLength: 1
    };

    const group_desc = 'string';
    const role = {
      type: "string",
      enum: ["owner", "dev", "guest"]
    }

    const member_uids = {
      type: "array",
      items: 'number',
      minItems: 1
    }



    this.schemaMap = {
      get: {
        "*id": id
      },
      add: {
        "*group_name": group_name,
        "group_desc": group_desc,
        "owner_uids": ['number']
      },
      addMember: {
        "*id": id,
        "role": role,
        "*member_uids": member_uids
      },
      changeMemberRole: {
        "*member_uid": "number",
        "*id": id,
        role: role
      },
      getMemberList: {
        "*id": id
      },
      delMember: {
        "*id": id,
        "*member_uid": "number"
      },
      del: {
        "*id": id
      },
      up: {
        "*id": id,
        "*group_name": group_name,
        "group_desc": group_desc,
        "custom_field1": {
          name: 'string',
          enable: 'boolen'
        },
        "custom_field2": {
          name: 'string',
          enable: 'boolen'
        },
        "custom_field3": {
          name: 'string',
          enable: 'boolen'
        }
      }
    }
  }

  /**
   * 查询项目分组
   * @interface /group/get
   * @method GET
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组ID
   * @returns {Object}
   * @example
   */
  async get(ctx) {
    let params = ctx.params;

    let groupInst = yapi.getInst(groupModel);
    let result = await groupInst.getGroupById(params.id);
    result = result.toObject();
    result.role = await this.getProjectRole(params.id, 'group');
    if (result.type === 'private') {
      result.group_name = 'Personal Space';
    }
    ctx.body = yapi.commons.resReturn(result);
  }

  /**
   * 添加项目分组
   * @interface /group/add
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} group_name 项目分组名称，不能为空
   * @param {String} [group_desc] 项目分组描述
   * @param {String} [owner_uids]  组长[uid]
   * @returns {Object}
   * @example ./api/group/add.json
   */
  async add(ctx) {
    let params = ctx.params;

    if (this.getRole() !== 'admin') {
      return ctx.body = yapi.commons.resReturn(null, 401, '没有权限');
    }

    let owners = [];

    if (params.owner_uids) {
      for (let i = 0, len = params.owner_uids.length; i < len; i++) {
        let id = params.owner_uids[i]
        let groupUserdata = await this.getUserdata(id, 'owner');
        if (groupUserdata) {
          owners.push(groupUserdata)
        }
      }
    }

    let groupInst = yapi.getInst(groupModel);

    let checkRepeat = await groupInst.checkRepeat(params.group_name);

    if (checkRepeat > 0) {
      return ctx.body = yapi.commons.resReturn(null, 401, '项目分组名已存在');
    }



    let data = {
      group_name: params.group_name,
      group_desc: params.group_desc,
      uid: this.getUid(),
      add_time: yapi.commons.time(),
      up_time: yapi.commons.time(),
      members: owners
    };

    let result = await groupInst.save(data);
    result = yapi.commons.fieldSelect(result, ['_id', 'group_name', 'group_desc', 'uid', 'members', 'type']);
    let username = this.getUsername();
    yapi.commons.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> Created new group <a href="/group/${result._id}">${params.group_name}</a>`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: result._id
    });
    ctx.body = yapi.commons.resReturn(result);

  }

  /**
   * 获取用户数据
   * @param uid
   * @param role
   * @returns {Promise.<*>}
   */

  async getUserdata(uid, role) {
    role = role || 'dev';
    let userInst = yapi.getInst(userModel);
    let userData = await userInst.findById(uid);
    if (!userData) {
      return null;
    }
    return {
      _role: userData.role,
      role: role,
      uid: userData._id,
      username: userData.username,
      email: userData.email
    }
  }

  /**
   * 添加项目分组成员
   * @interface /group/add_member
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uids 项目分组成员[uid]
   * @param {String} role 成员角色，owner or dev or guest
   * @returns {Object}
   * @example
   */
  async addMember(ctx) {

    let params = ctx.params;
    let groupInst = yapi.getInst(groupModel);

    params.role = ['owner', 'dev', 'guest'].find(v => v === params.role) || 'dev';
    let add_members = [];
    let exist_members = [];
    let no_members = []
    for (let i = 0, len = params.member_uids.length; i < len; i++) {
      let id = params.member_uids[i];
      let check = await groupInst.checkMemberRepeat(params.id, id);
      let userdata = await this.getUserdata(id, params.role);
      if (check > 0) {
        exist_members.push(userdata)
      } else if (!userdata) {
        no_members.push(id)
      } else {
        userdata.role !== 'admin' && add_members.push(userdata);
        delete userdata._role;
      }
    }


    let result = await groupInst.addMember(params.id, add_members);
    let username = this.getUsername();
    if (add_members.length) {
      let members = add_members.map((item) => {
        return `<a href = "/user/profile/${item.uid}">${item.username}</a>`
      })
      members = members.join("、");
      yapi.commons.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> added new member ${members} as ${rolename[params.role]}`,
        type: 'group',
        uid: this.getUid(),
        username: username,
        typeid: params.id
      });
    }
    ctx.body = yapi.commons.resReturn({
      result,
      add_members,
      exist_members,
      no_members
    });

  }


  /**
   * 修改项目分组成员角色
   * @interface /group/change_member_role
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uid 项目分组成员uid
   * @param {String} role 权限 ['owner'|'dev']
   * @returns {Object}
   * @example
   */
  async changeMemberRole(ctx) {
    let params = ctx.request.body;
    let groupInst = yapi.getInst(groupModel);

    var check = await groupInst.checkMemberRepeat(params.id, params.member_uid);
    if (check === 0) {
      return ctx.body = yapi.commons.resReturn(null, 400, '分组成员不存在');
    }
    if (await this.checkAuth(params.id, 'group', 'danger') !== true) {
      return ctx.body = yapi.commons.resReturn(null, 405, '没有权限');
    }

    params.role = ['owner', 'dev', 'guest'].find(v => v === params.role) || 'dev';


    let result = await groupInst.changeMemberRole(params.id, params.member_uid, params.role);
    let username = this.getUsername();

    let groupUserdata = await this.getUserdata(params.member_uid, params.role);
    yapi.commons.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> changed member <a href="/user/profile/${params.member_uid}">${groupUserdata.username}</a> 's role to "${rolename[params.role]}"`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id
    });
    ctx.body = yapi.commons.resReturn(result);

  }

  /**
   * 获取所有项目成员
   * @interface /group/get_member_list
   * @method GET
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @returns {Object}
   * @example
   */

  async getMemberList(ctx) {
    let params = ctx.params;
    let groupInst = yapi.getInst(groupModel);
    let group = await groupInst.get(params.id);
    ctx.body = yapi.commons.resReturn(group.members);
  }

  /**
   * 删除项目成员
   * @interface /group/del_member
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uid 项目分组成员uid
   * @returns {Object}
   * @example
   */

  async delMember(ctx) {
    let params = ctx.params;
    let groupInst = yapi.getInst(groupModel);
    var check = await groupInst.checkMemberRepeat(params.id, params.member_uid);
    if (check === 0) {
      return ctx.body = yapi.commons.resReturn(null, 400, '分组成员不存在');
    }
    if (await this.checkAuth(params.id, 'group', 'danger') !== true) {
      return ctx.body = yapi.commons.resReturn(null, 405, '没有权限');
    }


    let result = await groupInst.delMember(params.id, params.member_uid);
    let username = this.getUsername();

    let groupUserdata = await this.getUserdata(params.member_uid, params.role);
    yapi.commons.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> deleted group member <a href="/user/profile/${params.member_uid}">${groupUserdata.username}</a>`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id
    });
    ctx.body = yapi.commons.resReturn(result);

  }

  /**
   * 获取项目分组列表
   * @interface /group/list
   * @method get
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/list.json
   */
  async list(ctx) {

    var groupInst = yapi.getInst(groupModel);
    let projectInst = yapi.getInst(projectModel);
    let result = await groupInst.list();

    let privateGroup = await groupInst.getByPrivateUid(this.getUid());
    let newResult = [];

    if (!privateGroup) {
      privateGroup = await groupInst.save({
        uid: this.getUid(),
        group_name: 'User-' + this.getUid(),
        add_time: yapi.commons.time(),
        up_time: yapi.commons.time(),
        type: 'private'
      })
    }


    if (result && result.length > 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i].toObject();
        result[i].role = await this.getProjectRole(result[i]._id, 'group');
        if (result[i].role !== 'member') {
          newResult.unshift(result[i]);
        } else {
          let publicCount = await projectInst.countWithPublic(result[i]._id);
          if (publicCount > 0) {
            newResult.push(result[i]);
          } else {
            let projectCountWithAuth = await projectInst.getProjectWithAuth(result[i]._id, this.getUid());
            if (projectCountWithAuth > 0) {
              newResult.push(result[i]);
            }
          }

        }
      }
    }
    if (privateGroup) {
      privateGroup = privateGroup.toObject();
      privateGroup.group_name = 'Personal Space';
      privateGroup.role = 'owner';
      newResult.unshift(privateGroup);
    }

    ctx.body = yapi.commons.resReturn(newResult);

  }

  /**
   * 删除项目分组
   * @interface /group/del
   * @method post
   * @param {String} id 项目分组id
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/del.json
   */
  async del(ctx) {
    if (this.getRole() !== 'admin') {
      return ctx.body = yapi.commons.resReturn(null, 401, '没有权限');
    }

    let groupInst = yapi.getInst(groupModel);
    let projectInst = yapi.getInst(projectModel);
    let interfaceInst = yapi.getInst(interfaceModel);
    let interfaceColInst = yapi.getInst(interfaceColModel);
    let interfaceCaseInst = yapi.getInst(interfaceCaseModel);
    let id = ctx.params.id;

    let projectList = await projectInst.list(id, true);
    projectList.forEach(async (p) => {
      await interfaceInst.delByProjectId(p._id)
      await interfaceCaseInst.delByProjectId(p._id)
      await interfaceColInst.delByProjectId(p._id)
    })
    if (projectList.length > 0) {
      await projectInst.delByGroupid(id);
    }

    let result = await groupInst.del(id);
    ctx.body = yapi.commons.resReturn(result);

  }

  /**
   * 更新项目分组
   * @interface /group/up
   * @method post
   * @param {String} id 项目分组id
   * @param {String} group_name 项目分组名称
   * @param {String} group_desc 项目分组描述
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/up.json
   */
  async up(ctx) {

    let groupInst = yapi.getInst(groupModel);
    let params = ctx.params;

    if (await this.checkAuth(params.id, 'group', 'danger') !== true) {
      return ctx.body = yapi.commons.resReturn(null, 405, '没有权限');
    }

    let result = await groupInst.up(params.id, params);
    let username = this.getUsername();
    yapi.commons.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> updated <a href="/group/${params.id}">${params.group_name}</a> group`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id
    });
    ctx.body = yapi.commons.resReturn(result);
  }
}

module.exports = groupController;
