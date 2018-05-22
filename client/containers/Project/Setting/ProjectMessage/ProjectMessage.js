import React, { PureComponent as Component } from 'react';
import {
  Form,
  Input,
  Switch,
  Select,
  Icon,
  Tooltip,
  Button,
  Row,
  Col,
  message,
  Card,
  Radio,
  Alert,
  Modal,
  Popover
} from 'antd';
import PropTypes from 'prop-types';
import {
  updateProject,
  delProject,
  getProject,
  upsetProject
} from '../../../../reducer/modules/project';
import { fetchGroupMsg } from '../../../../reducer/modules/group';
import { fetchGroupList } from '../../../../reducer/modules/group.js';
import { setBreadcrumb } from '../../../../reducer/modules/user'
import { connect } from 'react-redux';
const { TextArea } = Input;
import { withRouter } from 'react-router';
const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;
import constants from '../../../../constants/variable.js';
const confirm = Modal.confirm;
import { nameLengthLimit, entries, trim } from '../../../../common';
import '../Setting.scss';
import _ from 'underscore'
// layout
const formItemLayout = {
  labelCol: {
    lg: { offset: 1, span: 3 },
    xs: { span: 24 },
    sm: { span: 6 }
  },
  wrapperCol: {
    lg: { span: 19 },
    xs: { span: 24 },
    sm: { span: 14 }
  },
  className: 'form-item'
};

const Option = Select.Option;

@connect(
  state => {
    return {
      projectList: state.project.projectList,
      groupList: state.group.groupList,
      projectMsg: state.project.currProject,
      currGroup: state.group.currGroup
    };
  },
  {
    updateProject,
    delProject,
    getProject,
    fetchGroupMsg,
    upsetProject,
    fetchGroupList,
    setBreadcrumb
  }
)
@withRouter
class ProjectMessage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      protocol: 'http://',
      projectMsg: {},
      showDangerOptions: false
    };
  }
  static propTypes = {
    projectId: PropTypes.number,
    form: PropTypes.object,
    updateProject: PropTypes.func,
    delProject: PropTypes.func,
    getProject: PropTypes.func,
    history: PropTypes.object,
    fetchGroupMsg: PropTypes.func,
    upsetProject: PropTypes.func,
    groupList: PropTypes.array,
    projectList: PropTypes.array,
    projectMsg: PropTypes.object,
    fetchGroupList: PropTypes.func,
    currGroup: PropTypes.object,
    setBreadcrumb: PropTypes.func
  };

  // 确认修改
  handleOk = e => {
    e.preventDefault();
    const { form, updateProject, projectMsg, groupList } = this.props;
    form.validateFields((err, values) => {
      if (!err) {
        let assignValue = Object.assign(projectMsg, values);
        values.protocol = this.state.protocol.split(':')[0];
        const group_id = assignValue.group_id;
        const selectGroup = _.find(groupList, (item)=>{
          return item._id == group_id
        })

        updateProject(assignValue)
          .then(res => {
            if (res.payload.data.errcode == 0) {
              this.props.getProject(this.props.projectId);
              message.success('Edit Success! ');

              // 如果如果项目所在的分组位置发生改变
              this.props.fetchGroupMsg(group_id);
              // this.props.history.push('/group');
              this.props.setBreadcrumb([{
                name: selectGroup.group_name,
                href: '/group/' + group_id
              },{
                name: assignValue.name
              }]);
            }
          })
          .catch(() => {});
        form.resetFields();
      }
    });
  };

  showConfirm = () => {
    let that = this;
    confirm({
      title: 'Confirm delete ' + that.props.projectMsg.name + ' project?',
      content: (
        <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: '25px' }}>
          <Alert
            message="Warning：this will delete all APIs under this project, and not revertible!"
            type="warning"
            banner
          />
          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px' }}>
              <b>Please enter Project Name to delete:</b>
            </p>
            <Input id="project_name" size="large" />
          </div>
        </div>
      ),
      onOk() {
        let groupName = trim(document.getElementById('project_name').value);
        if (that.props.projectMsg.name !== groupName) {
          message.error('Incorrect Name');
          return new Promise((resolve, reject) => {
            reject('error');
          });
        } else {
          that.props.delProject(that.props.projectId).then(res => {
            if (res.payload.data.errcode == 0) {
              message.success('Deleted!');
              that.props.history.push('/group/' + that.props.projectMsg.group_id);
            }
          });
        }
      },
      iconType: 'delete',
      onCancel() {}
    });
  };

  // 修改项目头像的背景颜色
  changeProjectColor = e => {
    const { _id, color, icon } = this.props.projectMsg;
    this.props.upsetProject({ id: _id, color: e.target.value || color, icon }).then(res => {
      if (res.payload.data.errcode === 0) {
        this.props.getProject(this.props.projectId);
      }
    });
  };
  // 修改项目头像的图标
  changeProjectIcon = e => {
    const { _id, color, icon } = this.props.projectMsg;
    this.props.upsetProject({ id: _id, color, icon: e.target.value || icon }).then(res => {
      if (res.payload.data.errcode === 0) {
        this.props.getProject(this.props.projectId);
      }
    });
  };

  // 点击“查看危险操作”按钮
  toggleDangerOptions = () => {
    // console.log(this.state.showDangerOptions);
    this.setState({
      showDangerOptions: !this.state.showDangerOptions
    });
  };

  async componentWillMount() {
    await this.props.fetchGroupList();
    // await this.props.getProject(this.props.projectId);
    await this.props.fetchGroupMsg(this.props.projectMsg.group_id);
  }

  render() {
    const { getFieldDecorator } = this.props.form;
    const { projectMsg, currGroup } = this.props;
    const mockUrl =
      location.protocol +
      '//' +
      location.hostname +
      (location.port !== '' ? ':' + location.port : '') +
      `/mock/${projectMsg._id}${projectMsg.basepath}+$request_path`;
    let initFormValues = {};
    const { name, basepath, desc, project_type, group_id, switch_notice } = projectMsg;
    initFormValues = { name, basepath, desc, project_type, group_id, switch_notice };

    const colorArr = entries(constants.PROJECT_COLOR);
    const colorSelector = (
      <RadioGroup onChange={this.changeProjectColor} value={projectMsg.color} className="color">
        {colorArr.map((item, index) => {
          return (
            <RadioButton
              key={index}
              value={item[0]}
              style={{ backgroundColor: item[1], color: '#fff', fontWeight: 'bold' }}
            >
              {item[0] === projectMsg.color ? <Icon type="check" /> : null}
            </RadioButton>
          );
        })}
      </RadioGroup>
    );
    const iconSelector = (
      <RadioGroup onChange={this.changeProjectIcon} value={projectMsg.icon} className="icon">
        {constants.PROJECT_ICON.map(item => {
          return (
            <RadioButton key={item} value={item} style={{ fontWeight: 'bold' }}>
              <Icon type={item} />
            </RadioButton>
          );
        })}
      </RadioGroup>
    );
    const selectDisbaled = projectMsg.role === 'owner' || projectMsg.role === 'admin';
    return (
      <div>
        <div className="m-panel">
          <Row className="project-setting">
            <Col xs={6} lg={{ offset: 1, span: 3 }} className="setting-logo">
              <Popover
                placement="bottom"
                title={colorSelector}
                content={iconSelector}
                trigger="click"
                overlayClassName="change-project-container"
              >
                <Icon
                  type={projectMsg.icon || 'star-o'}
                  className="ui-logo"
                  style={{
                    backgroundColor:
                      constants.PROJECT_COLOR[projectMsg.color] || constants.PROJECT_COLOR.blue
                  }}
                />
              </Popover>
            </Col>
            <Col xs={18} sm={15} lg={19} className="setting-intro">
              <h2 className="ui-title">
                {(currGroup.group_name || '') + ' / ' + (projectMsg.name || '')}
              </h2>
              {/* <p className="ui-desc">{projectMsg.desc}</p> */}
            </Col>
          </Row>
          <hr className="breakline" />
          <Form>
            <FormItem {...formItemLayout} label="Project ID">
              <span>{this.props.projectMsg._id}</span>
            </FormItem>
            <FormItem {...formItemLayout} label="Project Name">
              {getFieldDecorator('name', {
                initialValue: initFormValues.name,
                rules: nameLengthLimit('Project')
              })(<Input />)}
            </FormItem>
            <FormItem {...formItemLayout} label="Group">
              {getFieldDecorator('group_id', {
                initialValue: initFormValues.group_id + '',
                rules: [
                  {
                    required: true,
                    message: 'Plese select a group!'
                  }
                ]
              })(
                <Select disabled={!selectDisbaled}>
                  {this.props.groupList.map((item, index) => (
                    <Option value={item._id.toString()} key={index}>
                      {item.group_name}
                    </Option>
                  ))}
                </Select>
              )}
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                    {`Base path`}&nbsp;
                  <Tooltip title="base url as root if left blank">
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
            >
              {getFieldDecorator('basepath', {
                initialValue: initFormValues.basepath,
                rules: [
                  {
                    required: false,
                    message: 'Enter base path! '
                  }
                ]
              })(<Input />)}
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  MOCK地址&nbsp;
                  <Tooltip title="see documentation for details">
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
            >
              <Input disabled value={mockUrl} onChange={() => {}} />
            </FormItem>

            <FormItem {...formItemLayout} label="Description">
              {getFieldDecorator('desc', {
                initialValue: initFormValues.desc,
                rules: [
                  {
                    required: false
                  }
                ]
              })(<TextArea rows={8} />)}
            </FormItem>
            <FormItem {...formItemLayout} label="Default to turn on email notification">
              {getFieldDecorator('switch_notice', {
                valuePropName: 'checked',
                initialValue: initFormValues.switch_notice
              })(<Switch checkedChildren="On" unCheckedChildren="Off" />)}
            </FormItem>

            <FormItem {...formItemLayout} label="Scope">
              {getFieldDecorator('project_type', {
                rules: [
                  {
                    required: true
                  }
                ],
                initialValue: initFormValues.project_type
              })(
                <RadioGroup>
                  <Radio value="private" className="radio">
                    <Icon type="lock" />Private<br />
                    <span className="radio-desc">{`Only group owner and developer can index and see this project`}</span>
                  </Radio>
                  <br />
                  <Radio value="public" className="radio">
                    <Icon type="unlock" />Public<br />
                    <span className="radio-desc">{`Everyone can see the project`}</span>
                  </Radio>
                </RadioGroup>
              )}
            </FormItem>
          </Form>

          <div className="btnwrap-changeproject">
            <Button
              className="m-btn btn-save"
              icon="save"
              type="primary"
              size="large"
              onClick={this.handleOk}
            >
                Save
            </Button>
          </div>

          {/* 只有组长和管理员有权限删除项目 */}
          {projectMsg.role === 'owner' || projectMsg.role === 'admin' ? (
            <div className="danger-container">
              <div className="title">
                <h2 className="content">
                  <Icon type="exclamation-circle-o" /> Danger
                </h2>
                <Button onClick={this.toggleDangerOptions}>
                  See<Icon type={this.state.showDangerOptions ? 'up' : 'down'} />
                </Button>
              </div>
              {this.state.showDangerOptions ? (
                <Card hoverable={true} className="card-danger">
                  <div className="card-danger-content">
                    <h3>{`Delete project`}</h3>
                    <p>{`deleted data is not revertile`}</p>
                    <p>{`Only group owner and admin can delete projects`}</p>
                  </div>
                  <Button
                    type="danger"
                    ghost
                    className="card-danger-btn"
                    onClick={this.showConfirm}
                  >
                    Delete
                  </Button>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

export default Form.create()(ProjectMessage);
