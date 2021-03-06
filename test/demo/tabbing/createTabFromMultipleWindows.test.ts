import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';

import {TabGroup} from '../../../src/client/types';
import {DesktopTabGroup} from '../../../src/provider/model/DesktopTabGroup';
import {getConnection} from '../../provider/utils/connect';
import {getBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {teardown} from '../../teardown';
import {executeJavascriptOnService} from '../utils/serviceUtils';
import {getId} from '../utils/tabServiceUtils';

let win1: Window;
let win2: Window;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(async () => {
    await win1.close();
    await win2.close();
    fin.InterApplicationBus.removeAllListeners();
});

test.afterEach.always(teardown);

test('Create tab group from 2 windows', async (assert) => {
    // Arrange
    const app1: Application = await createTabbingWindow('default', 'tabapp1', 200);
    const app2: Application = await createTabbingWindow('default', 'tabapp2', 500);

    await Promise.all([app1.run(), app2.run()]);

    win1 = await app1.getWindow();
    win2 = await app2.getWindow();
    const preWin2Bounds = await win2.getBounds();

    const tabGroups: TabGroup[] = [{
        groupInfo: {
            url: 'http://localhost:1337/provider/tabbing/tabstrip/tabstrip.html',
            active: {uuid: win2.identity.uuid, name: win2.identity.name!},
            dimensions: {x: 100, y: 100, width: preWin2Bounds.width, tabGroupHeight: 60, appHeight: preWin2Bounds.height}
        },
        tabs: [
            {uuid: app1.identity.uuid, name: win1.identity.name!},
            {uuid: app2.identity.uuid, name: win2.identity.name!},
        ]
    }];

    // Get the service window in order to be able to find the tabgroup window
    const serviceApplication: Application = await fin.Application.wrap({uuid: 'layouts-service', name: 'layouts-service'});


    // Act
    function scriptToExecute(this: ProviderWindow, tabGroups: TabGroup[]): Promise<string> {
        return this.tabService.createTabGroupsFromLayout(tabGroups).then((addedGroups: DesktopTabGroup[]) => {
            return addedGroups[0].id;
        });
    }
    const tabGroupId: string = await executeJavascriptOnService<TabGroup[], string>(scriptToExecute, tabGroups);
    assert.truthy(tabGroupId);

    // Tab group should have been created
    const serviceChildWindows: Window[] = await serviceApplication.getChildWindows();
    const newTabGroupWindow: Window|undefined = serviceChildWindows.find((window: Window) => {
        return getId(window.identity) === tabGroupId;
    });
    assert.truthy(newTabGroupWindow);

    // Assert
    const win1Bounds: NormalizedBounds = await getBounds(win1);
    const win2Bounds: NormalizedBounds = await getBounds(win2);
    const tabGroupBounds: NormalizedBounds = await getBounds(newTabGroupWindow!);

    // Window Bounds equality check
    assert.is(win2Bounds.bottom, win1Bounds.bottom);
    assert.is(win2Bounds.height, win1Bounds.height);
    assert.is(win2Bounds.left, win1Bounds.left);
    assert.is(win2Bounds.right, win1Bounds.right);
    assert.is(win2Bounds.top, win1Bounds.top);
    assert.is(win2Bounds.width, win1Bounds.width);
    assert.is(win2Bounds.top, (tabGroups[0].groupInfo.dimensions.y + tabGroups[0].groupInfo.dimensions.tabGroupHeight));
    assert.is(win2Bounds.left, tabGroups[0].groupInfo.dimensions.x);


    // TabGroup existence check
    assert.is(tabGroupBounds.bottom, win2Bounds.top);
    assert.is(tabGroupBounds.width, win2Bounds.width);
    assert.is(tabGroupBounds.left, win1Bounds.left);
    assert.is(tabGroupBounds.right, win1Bounds.right);
    assert.is(tabGroupBounds.top + tabGroupBounds.height, win2Bounds.top);
});

/**
 * Creates a window with tabbing initialised
 * @param page The html page to display
 * @param uuid The uuid for the application
 * @param left The left position
 */
async function createTabbingWindow(page: string, uuid: string, left: number): Promise<Application> {
    return fin.Application.create({
        url: `http://localhost:1337/demo/tabbing/${page}.html`,
        uuid,
        name: uuid,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 200,
            defaultLeft: left,
            defaultHeight: 200,
            defaultWidth: 200,
            frame: false,
            defaultCentered: true
        }
    });
}