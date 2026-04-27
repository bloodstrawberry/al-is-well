import { _mock } from 'src/_mock';
import { IKanban } from 'src/types/kanban';

// ----------------------------------------------------------------------

export const BOARD_DATA: IKanban = {
  columns: [
    { id: 'column-1', name: 'To Do' },
    { id: 'column-2', name: 'In Progress' },
    { id: 'column-3', name: 'Done' },
    { id: 'column-4', name: 'Validation' },
  ],
  tasks: {
    'column-1': [
      {
        id: 'task-1',
        name: _mock.taskNames(0),
        status: 'To Do',
        priority: 'medium',
        labels: ['Feature'],
        description: _mock.description(0),
        attachments: [],
        comments: [],
        assignee: [
          {
            id: _mock.id(1),
            name: _mock.fullName(1),
            role: _mock.role(1),
            email: _mock.email(1),
            status: 'online',
            address: _mock.fullAddress(1),
            avatarUrl: _mock.image.avatar(1),
            phoneNumber: _mock.phoneNumber(1),
            lastActivity: _mock.time(1),
          },
        ],
        due: [null, null],
        reporter: {
          id: _mock.id(2),
          name: _mock.fullName(2),
          avatarUrl: _mock.image.avatar(2),
        },
      },
      {
        id: 'task-2',
        name: _mock.taskNames(1),
        status: 'To Do',
        priority: 'high',
        labels: ['Bug'],
        description: _mock.description(1),
        attachments: [],
        comments: [],
        assignee: [],
        due: [null, null],
        reporter: {
          id: _mock.id(3),
          name: _mock.fullName(3),
          avatarUrl: _mock.image.avatar(3),
        },
      },
    ],
    'column-2': [
      {
        id: 'task-3',
        name: _mock.taskNames(2),
        status: 'In Progress',
        priority: 'low',
        labels: ['Documentation'],
        description: _mock.description(2),
        attachments: [],
        comments: [],
        assignee: [
          {
            id: _mock.id(4),
            name: _mock.fullName(4),
            role: _mock.role(4),
            email: _mock.email(4),
            status: 'offline',
            address: _mock.fullAddress(4),
            avatarUrl: _mock.image.avatar(4),
            phoneNumber: _mock.phoneNumber(4),
            lastActivity: _mock.time(4),
          },
        ],
        due: [null, null],
        reporter: {
          id: _mock.id(5),
          name: _mock.fullName(5),
          avatarUrl: _mock.image.avatar(5),
        },
      },
    ],
    'column-3': [],
    'column-4': [
        {
            id: 'task-4',
            name: _mock.taskNames(3),
            status: 'Validation',
            priority: 'medium',
            labels: ['Feature'],
            description: _mock.description(3),
            attachments: [],
            comments: [],
            assignee: [],
            due: [null, null],
            reporter: {
              id: _mock.id(6),
              name: _mock.fullName(6),
              avatarUrl: _mock.image.avatar(6),
            },
          },
    ],
  },
};
